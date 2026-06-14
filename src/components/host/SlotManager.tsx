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

    const slotsByBand = useMemo(() => {
        const bands = new Map<TimeBand, { start: string; state: string }[]>()
        for (const band of TIME_BAND_ORDER) bands.set(band, [])
        for (const slot of slotsForSelectedDay) {
            const hour = new Date(slot.start).getUTCHours()
            const band = getTimeBand(hour)
            bands.get(band)!.push(slot)
        }
        return bands
    }, [slotsForSelectedDay])

    const openCount = useMemo(
        () => hostSlots.data?.filter(s => s.state === 'available').length ?? 0,
        [hostSlots.data],
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
                <span className="text-sm text-muted-foreground">
                    {openCount} open slots
                </span>
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
                    <div className="space-y-4">
                        {TIME_BAND_ORDER.map((band) => {
                            const bandSlots = slotsByBand.get(band) ?? []
                            if (bandSlots.length === 0) return null
                            return (
                                <div key={band}>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                                        {timeBandLabel(band)}
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {bandSlots.map((slot) => {
                                            const isBooked = slot.state === 'booked'
                                            const isAvailable = slot.state === 'available'
                                            return (
                                                <Button
                                                    key={slot.start}
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isBooked || editAvailability.isPending}
                                                    className={`
                                                        h-8 min-w-[70px] text-xs
                                                        ${isBooked
                                                        ? 'bg-destructive/10 border-destructive/30 text-destructive cursor-not-allowed'
                                                        : isAvailable
                                                            ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                                                            : 'bg-muted border-muted text-muted-foreground hover:bg-muted/80'
                                                    }
                                                    `}
                                                    onClick={() => toggleSlot(slot)}
                                                >
                                                    {formatTime(new Date(slot.start))}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
