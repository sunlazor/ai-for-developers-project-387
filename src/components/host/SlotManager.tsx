import {useState, useMemo} from 'react'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {api} from '@/api/client'
import {Button} from '@/components/ui/button'
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {toast} from '@/components/ui/use-toast'
import {
    getMondayOfWeek,
    getWeekDays,
    formatDate,
    formatDateShort,
    formatTime,
    generateSlotStarts,
    getTimeBand,
    TIME_BAND_ORDER,
    timeBandLabel,
    type TimeBand,
} from '@/lib/utils'
import type {HostSlot} from '@/types/booking'

interface SlotManagerProps {
    token: string
}

const WEEK_COUNT = 5
const HOURS = Array.from({length: 24}, (_, i) => i)

function useCurrentWeek() {
    const [weekOffset, setWeekOffset] = useState(0)
    const allMondays = useMemo(() => {
        const baseMonday = getMondayOfWeek(new Date())
        return Array.from({length: WEEK_COUNT}, (_, i) => {
            const m = new Date(baseMonday)
            m.setUTCDate(baseMonday.getUTCDate() + i * 7)
            return m
        })
    }, [])
    const monday = allMondays[weekOffset]
    const days = useMemo(() => getWeekDays(monday), [monday])
    return {monday, days, weekOffset, allMondays, setWeekOffset}
}

export function SlotManager({token}: SlotManagerProps) {
    const queryClient = useQueryClient()
    const {days, weekOffset, allMondays, setWeekOffset} = useCurrentWeek()
    const [selectedDay, setSelectedDay] = useState<Date | null>(days[0])

    const hostSlots = useQuery({
        queryKey: ['host-availability', token],
        queryFn: () => api.getHostAvailability(token),
        enabled: !!token,
    })

    const editAvailability = useMutation({
        mutationFn: (edits: { start: string; state: 'available' | 'unavailable' }[]) =>
            api.editAvailability(edits, token),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['host-availability']})
            toast({title: 'Availability updated'})
        },
        onError: (err: Error) => {
            toast({
                title: 'Failed to update',
                description: err?.message ?? 'Something went wrong',
                variant: 'destructive',
            })
        },
    })

    const slotsByDay = useMemo(() => {
        if (!hostSlots.data) return new Map<string, HostSlot[]>()
        const map = new Map<string, HostSlot[]>()
        for (const slot of hostSlots.data) {
            const dayKey = slot.start.slice(0, 10)
            if (!map.has(dayKey)) map.set(dayKey, [])
            map.get(dayKey)!.push(slot)
        }
        return map
    }, [hostSlots.data])

    const slotsForSelectedDay = useMemo(() => {
        if (!selectedDay) return []
        const dayKey = selectedDay.toISOString().slice(0, 10)
        const realSlots = slotsByDay.get(dayKey) ?? []
        const dayStart = new Date(selectedDay)
        dayStart.setUTCHours(0, 0, 0, 0)
        const dayEnd = new Date(selectedDay)
        dayEnd.setUTCHours(23, 45, 0, 0)
        const allStarts = generateSlotStarts(dayStart, dayEnd)
        const realLookup = new Map(realSlots.map(s => [s.start, s]))
        return allStarts.map(start =>
            realLookup.get(start) ?? {start, state: 'unavailable' as const},
        )
    }, [selectedDay, slotsByDay])

    const hourRows = useMemo(() => {
        return HOURS.map(hour => {
            const slots = slotsForSelectedDay.filter(s => new Date(s.start).getUTCHours() === hour)
            return {hour, slots, band: slots.length > 0 ? getTimeBand(hour) : null}
        }).filter(r => r.band !== null) as { hour: number; slots: { start: string; state: string }[]; band: TimeBand }[]
    }, [slotsForSelectedDay])

    const openCount = useMemo(
        () => slotsForSelectedDay.filter(s => s.state === 'available').length,
        [slotsForSelectedDay],
    )

    function toggleSlot(slot: { start: string; state: string }) {
        if (slot.state === 'booked') {
            toast({
                title: 'Cannot edit booked slot',
                description: 'Cancel the booking first.',
                variant: 'destructive',
            })
            return
        }
        const targetState = slot.state === 'available' ? 'unavailable' : 'available'
        editAvailability.mutate([{start: slot.start, state: targetState}])
    }

    function toggleBand(band: TimeBand, targetState: 'available' | 'unavailable') {
        const edits = hourRows
            .filter(r => r.band === band)
            .flatMap(r => r.slots)
            .filter(s => s.state !== 'booked' && s.state !== targetState)
            .map(s => ({start: s.start, state: targetState}))
        if (edits.length === 0) {
            toast({title: `All ${timeBandLabel(band).toLowerCase()} slots already ${targetState}`})
            return
        }
        editAvailability.mutate(edits)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Tabs
                    value={String(weekOffset)}
                    onValueChange={(v) => {
                        const offset = Number(v)
                        setWeekOffset(offset)
                        const newMonday = allMondays[offset]
                        setSelectedDay(getWeekDays(newMonday)[0])
                    }}
                >
                    <TabsList>
                        {allMondays.map((m, i) => {
                            const weekEnd = new Date(m)
                            weekEnd.setUTCDate(m.getUTCDate() + 6)
                            return (
                                <TabsTrigger key={i} value={String(i)} className="text-xs px-2 py-1.5">
                                    {formatDateShort(m)} — {formatDateShort(weekEnd)}
                                </TabsTrigger>
                            )
                        })}
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-3">
                    {hostSlots.isFetching && (
                        <span className="text-xs text-muted-foreground animate-pulse">Syncing...</span>
                    )}
                    <span className="text-sm text-muted-foreground">
                        {openCount} open slots
                    </span>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((day) => {
                    const isSelected =
                        selectedDay &&
                        day.toISOString().slice(0, 10) === selectedDay.toISOString().slice(0, 10)
                    const dayKey = day.toISOString().slice(0, 10)
                    const daySlots = slotsByDay.get(dayKey)
                    const dayOpen = daySlots?.filter(s => s.state === 'available').length ?? 0
                    return (
                        <Button
                            key={dayKey}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="flex-col h-auto py-2 px-3 min-w-[80px]"
                            onClick={() => setSelectedDay(day)}
                        >
                            <span className="text-xs font-normal">
                                {day.toLocaleDateString('en-US', {weekday: 'short', timeZone: 'UTC'})}
                            </span>
                            <span className="text-sm font-semibold">
                                {day.getUTCDate()}
                            </span>
                            <span className={`text-xs ${dayOpen > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                                {dayOpen} open
                            </span>
                        </Button>
                    )
                })}
            </div>

            {selectedDay && (
                <div>
                    <h3 className="text-lg font-semibold mb-3">
                        {formatDate(selectedDay)}
                    </h3>

                    {hostSlots.isLoading && (
                        <p className="text-muted-foreground text-sm">Loading slots...</p>
                    )}

                    {!hostSlots.isLoading && hourRows.length === 0 && (
                        <p className="text-muted-foreground text-sm">No slots found.</p>
                    )}

                    {!hostSlots.isLoading && hourRows.length > 0 && (
                        <>
                            <div className="space-y-0">
                                {TIME_BAND_ORDER.map(band => {
                                    const bandRows = hourRows.filter(r => r.band === band)
                                    if (bandRows.length === 0) return null
                                    return (
                                        <div key={band}>
                                            <div className="flex items-center gap-2 py-2 border-b border-border/40">
                                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    {timeBandLabel(band)}
                                                </h4>
                                                <div className="flex gap-2 ml-auto">
                                                    <button
                                                        type="button"
                                                        className="text-[11px] text-green-600 hover:text-green-700 font-medium"
                                                        onClick={() => toggleBand(band, 'available')}
                                                        disabled={editAvailability.isPending}
                                                    >
                                                        Open all
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                                                        onClick={() => toggleBand(band, 'unavailable')}
                                                        disabled={editAvailability.isPending}
                                                    >
                                                        Close all
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="py-1">
                                                {bandRows.map(({hour, slots}) => (
                                                    <div
                                                        key={hour}
                                                        className="grid grid-cols-[44px_repeat(4,1fr)] gap-0.5 py-0.5 items-center hover:bg-muted/20 rounded-sm"
                                                    >
                                                        <div className="text-[11px] text-muted-foreground tabular-nums text-right pr-2">
                                                            {String(hour).padStart(2, '0')}:00
                                                        </div>
                                                        {slots.map(slot => {
                                                            const isBooked = slot.state === 'booked'
                                                            const isAvailable = slot.state === 'available'
                                                            return (
                                                                <button
                                                                    key={slot.start}
                                                                    type="button"
                                                                    disabled={isBooked || editAvailability.isPending}
                                                                    title={`${formatTime(new Date(slot.start))} — ${slot.state}`}
                                                                    onClick={() => toggleSlot(slot)}
                                                                    className={`
                                                                        h-6 rounded-sm border transition-colors
                                                                        ${isBooked
                                                                            ? 'bg-destructive/20 border-destructive/40 cursor-not-allowed'
                                                                            : isAvailable
                                                                                ? 'bg-green-400/70 border-green-500/50 hover:bg-green-400 cursor-pointer'
                                                                                : 'bg-muted/40 border-muted-foreground/15 hover:bg-muted-foreground/10 cursor-pointer'
                                                                        }
                                                                    `}
                                                                />
                                                            )
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="flex gap-4 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm bg-green-400/70 border border-green-500/50 inline-block" />
                                    Available
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm bg-muted/40 border border-muted-foreground/15 inline-block" />
                                    Unavailable
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm bg-destructive/20 border border-destructive/40 inline-block" />
                                    Booked
                                </span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
