import {useState} from 'react'
import {useParams, useNavigate} from 'react-router-dom'
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

const bookingSchema = z.object({
    visitorName: z.string().min(1, 'Name is required'),
    visitorEmail: z.string().email('Valid email is required'),
})

type BookingForm = z.infer<typeof bookingSchema>

export function BookingPage() {
    const {slug} = useParams<{ slug: string }>()
    const navigate = useNavigate()
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

    const {data: bookingType, isLoading: btLoading} = useQuery({
        queryKey: ['bookingType', slug],
        queryFn: async () => {
            const types = await api.listBookingTypes()
            return types.find((bt) => bt.slug === slug)
        },
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
                bookingTypeSlug: slug!,
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

    if (btLoading || slotsLoading) return <p>Loading...</p>
    if (!bookingType) return <p>Booking type not found.</p>

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{bookingType.title}</CardTitle>
                    <CardDescription>{bookingType.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Duration: {bookingType.durationSlots * 15} minutes
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pick a time</CardTitle>
                </CardHeader>
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

            {selectedSlot && (
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