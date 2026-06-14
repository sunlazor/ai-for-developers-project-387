import {useState, useEffect} from 'react'
import {useSearchParams, useNavigate} from 'react-router-dom'
import {useQuery, useMutation} from '@tanstack/react-query'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {z} from 'zod'
import {api} from '@/api/client'
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {toast} from '@/components/ui/use-toast'
import {formatTime, formatDate} from '@/lib/utils'
import {Clock, AlertCircle} from 'lucide-react'

const bookingSchema = z.object({
    visitorName: z.string().min(1, 'Name is required'),
    visitorEmail: z.string().email('Valid email is required'),
})

type BookingForm = z.infer<typeof bookingSchema>

export function BookingFlowPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [selectedTypeSlug, setSelectedTypeSlug] = useState<string | null>(null)
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

    const initialType = searchParams.get('type')
    const initialSlot = searchParams.get('slot')

    useEffect(() => {
        if (initialType) setSelectedTypeSlug(initialType)
        if (initialSlot) setSelectedSlot(initialSlot)
    }, [initialType, initialSlot])

    const {data: bookingTypes, isLoading: btLoading} = useQuery({
        queryKey: ['bookingTypes'],
        queryFn: api.listBookingTypes,
    })

    const {data: slots, isLoading: slotsLoading} = useQuery({
        queryKey: ['availability'],
        queryFn: api.getAvailability,
    })

    const {register, handleSubmit, formState: {errors}} = useForm<BookingForm>({
        resolver: zodResolver(bookingSchema),
    })

    const createBooking = useMutation({
        mutationFn: (data: BookingForm) =>
            api.createBooking({
                bookingTypeSlug: selectedTypeSlug!,
                startSlot: selectedSlot!,
                visitorName: data.visitorName,
                visitorEmail: data.visitorEmail,
            }),
        onSuccess: () => {
            toast({title: 'Booked!', description: 'Your meeting has been scheduled.'})
            navigate('/')
        },
        onError: (err: Error) => {
            toast({
                title: 'Booking failed',
                description: err?.message ?? 'Something went wrong.',
                variant: 'destructive',
            })
        },
    })

    const activeTypes = bookingTypes?.filter((bt) => bt.active) ?? []
    const selectedType = bookingTypes?.find((bt) => bt.slug === selectedTypeSlug)

    if (btLoading || slotsLoading) return <p className="text-center py-8">Loading...</p>

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <section>
                <h2 className="text-2xl font-semibold mb-4">Choose a meeting type</h2>
                {activeTypes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <span className="text-6xl mb-4">🏖️</span>
                        <p className="text-lg font-medium">Host on weekation</p>
                        <p className="text-muted-foreground mt-1">
                            No meeting types are available right now.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {activeTypes.map((bt) => (
                            <Card
                                key={bt.slug}
                                className={`cursor-pointer transition-all ${
                                    selectedTypeSlug === bt.slug
                                        ? 'ring-2 ring-primary border-primary'
                                        : 'hover:border-primary/50'
                                }`}
                                onClick={() => {
                                    setSelectedTypeSlug(bt.slug)
                                    setSelectedSlot(null)
                                }}
                            >
                                <CardHeader>
                                    <CardTitle>{bt.title}</CardTitle>
                                    <CardDescription>{bt.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4"/>
                                        <span>{bt.durationSlots * 15} minutes</span>
                                    </div>
                                    <Button
                                        className="w-full"
                                        variant={selectedTypeSlug === bt.slug ? 'default' : 'outline'}
                                    >
                                        {selectedTypeSlug === bt.slug ? 'Selected' : 'Select'}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {selectedTypeSlug && selectedType && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-semibold">Pick a time</h2>
                            <p className="text-muted-foreground">
                                {selectedType.title} — {selectedType.durationSlots * 15} minutes
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTypeSlug(null)}>
                            Change type
                        </Button>
                    </div>

                    {slots && slots.length === 0 ? (
                        <Card>
                            <CardContent className="py-8 text-center">
                                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2"/>
                                <p className="text-lg font-medium">No available slots</p>
                                <p className="text-muted-foreground mt-1">
                                    No available slots for this meeting type.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {slots?.map((slot) => {
                                        const date = new Date(slot.start)
                                        return (
                                            <Button
                                                key={slot.start}
                                                variant={selectedSlot === slot.start ? 'default' : 'outline'}
                                                className="flex-col h-auto py-3"
                                                onClick={() => setSelectedSlot(slot.start)}
                                            >
                                                <span className="text-xs">{formatDate(date)}</span>
                                                <span className="text-sm font-medium">{formatTime(date)}</span>
                                            </Button>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </section>
            )}

            {selectedSlot && selectedType && (
                <Card>
                    <CardHeader>
                        <CardTitle>Your details</CardTitle>
                    </CardHeader>
                    <form onSubmit={handleSubmit((data) => createBooking.mutate(data))}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="visitorName">Name</Label>
                                <Input id="visitorName" {...register('visitorName')} />
                                {errors.visitorName && (
                                    <p className="text-sm text-destructive">{errors.visitorName.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="visitorEmail">Email</Label>
                                <Input id="visitorEmail" type="email" {...register('visitorEmail')} />
                                {errors.visitorEmail && (
                                    <p className="text-sm text-destructive">{errors.visitorEmail.message}</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={createBooking.isPending}>
                                {createBooking.isPending ? 'Booking...' : 'Confirm Booking'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}
        </div>
    )
}