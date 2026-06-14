import {useState} from 'react'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {api} from '@/api/client'
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs'
import {toast} from '@/components/ui/use-toast'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import {CreateBookingTypeDialog} from '@/components/host/CreateBookingTypeDialog'
import {SlotManager} from '@/components/host/SlotManager'
import {formatDate, formatTime} from '@/lib/utils'

export function HostPage() {
    const [token, setToken] = useState('')
    const [isAuthed, setIsAuthed] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)
    const [confirmAction, setConfirmAction] = useState<{
        type: 'activate' | 'deactivate'
        slug: string
        title: string
    } | null>(null)
    const queryClient = useQueryClient()

    const bookingTypes = useQuery({
        queryKey: ['host-bookingTypes'],
        queryFn: () => api.listAllBookingTypes(token),
        enabled: isAuthed,
    })

    const bookings = useQuery({
        queryKey: ['host-bookings', token],
        queryFn: () => api.listBookings(token),
        enabled: isAuthed,
    })

    const deactivateBt = useMutation({
        mutationFn: (slug: string) => api.deactivateBookingType(slug, token),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['host-bookingTypes']})
            toast({title: 'Booking type deactivated'})
            setConfirmAction(null)
        },
        onError: (err: Error) => {
            toast({
                title: 'Failed to deactivate',
                description: err?.message ?? 'Something went wrong',
                variant: 'destructive',
            })
            setConfirmAction(null)
        },
    })

    const activateBt = useMutation({
        mutationFn: (slug: string) => api.activateBookingType(slug, token),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['host-bookingTypes']})
            toast({title: 'Booking type activated'})
            setConfirmAction(null)
        },
        onError: (err: Error) => {
            toast({
                title: 'Failed to activate',
                description: err?.message ?? 'Something went wrong',
                variant: 'destructive',
            })
            setConfirmAction(null)
        },
    })

    const cancelBooking = useMutation({
        mutationFn: (id: string) => api.cancelBooking(id, token),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['host-bookings']})
            queryClient.invalidateQueries({queryKey: ['host-availability']})
            toast({title: 'Cancelled'})
        },
    })

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <section>
                <h1 className="text-3xl font-bold mb-4">Host Dashboard (token: calendai-host-secret)</h1>
                {!isAuthed ? (
                    <div className="flex gap-2 max-w-sm flex-col">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Host token"
                                value={token}
                                onChange={(e) => {
                                    setToken(e.target.value)
                                    setAuthError(null)
                                }}
                            />
                            <Button
                                onClick={async () => {
                                    setIsVerifying(true)
                                    setAuthError(null)
                                    try {
                                        await api.getHostAvailability(token)
                                        setIsAuthed(true)
                                    } catch {
                                        setAuthError('Wrong token')
                                    } finally {
                                        setIsVerifying(false)
                                    }
                                }}
                                disabled={isVerifying}
                            >
                                {isVerifying ? 'Verifying…' : 'Login'}
                            </Button>
                        </div>
                        {authError && (
                            <p className="text-sm text-destructive">{authError}</p>
                        )}
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => {
                        setIsAuthed(false);
                        setToken('')
                    }}>
                        Logout
                    </Button>
                )}
            </section>

            {isAuthed && (
                <Tabs defaultValue="bookings">
                    <TabsList>
                        <TabsTrigger value="bookings">Bookings</TabsTrigger>
                        <TabsTrigger value="slots">Slots</TabsTrigger>
                        <TabsTrigger value="booking-types">Booking Types</TabsTrigger>
                    </TabsList>

                    <TabsContent value="booking-types">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-semibold">Booking Types</h2>
                            <CreateBookingTypeDialog token={token}/>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {bookingTypes.data?.map((bt) => (
                                <Card key={bt.slug}>
                                    <CardHeader>
                                        <CardTitle>{bt.title}</CardTitle>
                                        <CardDescription>{bt.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            {bt.durationSlots * 15} min &middot; {bt.active ? 'Active' : 'Inactive'}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="gap-2">
                                        {bt.active ? (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() =>
                                                    setConfirmAction({
                                                        type: 'deactivate',
                                                        slug: bt.slug,
                                                        title: bt.title,
                                                    })
                                                }
                                            >
                                                Deactivate
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    setConfirmAction({
                                                        type: 'activate',
                                                        slug: bt.slug,
                                                        title: bt.title,
                                                    })
                                                }
                                            >
                                                Activate
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="slots">
                        <SlotManager token={token}/>
                    </TabsContent>

                    <TabsContent value="bookings">
                        <h2 className="text-2xl font-semibold mb-4">Bookings</h2>
                        {bookings.data?.length === 0 && (
                            <p className="text-muted-foreground">No bookings yet.</p>
                        )}
                        <div className="space-y-3">
                            {bookings.data?.map((booking) => (
                                <Card key={booking.id}>
                                    <CardContent className="flex items-center justify-between py-4">
                                        <div>
                                            <p className="font-medium">{booking.visitorName}</p>
                                            <p className="text-sm text-muted-foreground">{booking.visitorEmail}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(new Date(booking.startSlot))} at{' '}
                                                {formatTime(new Date(booking.startSlot))}
                                            </p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => cancelBooking.mutate(booking.id)}
                                        >
                                            Cancel
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}

            {isAuthed && confirmAction && (
                <Dialog open onOpenChange={() => setConfirmAction(null)}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle>
                                {confirmAction.type === 'deactivate'
                                    ? 'Deactivate Booking Type'
                                    : 'Activate Booking Type'}
                            </DialogTitle>
                            <DialogDescription>
                                {confirmAction.type === 'deactivate'
                                    ? `"${confirmAction.title}" will be hidden from visitors. Existing bookings remain valid.`
                                    : `"${confirmAction.title}" will be visible to visitors again.`}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setConfirmAction(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant={
                                    confirmAction.type === 'deactivate'
                                        ? 'destructive'
                                        : 'default'
                                }
                                onClick={() => {
                                    const fn =
                                        confirmAction.type === 'deactivate'
                                            ? deactivateBt.mutate
                                            : activateBt.mutate
                                    fn(confirmAction.slug)
                                }}
                                disabled={
                                    deactivateBt.isPending || activateBt.isPending
                                }
                            >
                                {confirmAction.type === 'deactivate'
                                    ? 'Deactivate'
                                    : 'Activate'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}