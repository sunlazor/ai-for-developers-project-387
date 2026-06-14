import {useState} from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {z} from 'zod'
import {useMutation, useQueryClient} from '@tanstack/react-query'
import {api} from '@/api/client'
import {toast} from '@/components/ui/use-toast'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'
import {Label} from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog'

const createBtSchema = z.object({
    slug: z
        .string()
        .min(1, 'Slug is required')
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be URL-friendly (e.g. quick-chat)'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    durationSlots: z.coerce.number().int().min(1, 'Must be at least 1 slot (15 min)'),
})

type CreateBtForm = z.infer<typeof createBtSchema>

interface Props {
    token: string
}

export function CreateBookingTypeDialog({token}: Props) {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()

    const {
        register,
        handleSubmit,
        formState: {errors},
        reset,
    } = useForm<CreateBtForm>({
        resolver: zodResolver(createBtSchema),
        defaultValues: {
            slug: '',
            title: '',
            description: '',
            durationSlots: 1,
        },
    })

    const mutation = useMutation({
        mutationFn: (data: CreateBtForm) => api.createBookingType(data, token),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['host-bookingTypes']})
            toast({title: 'Booking type created'})
            setOpen(false)
            reset()
        },
        onError: (err: Error) => {
            toast({
                title: 'Failed to create',
                description: err?.message ?? 'Something went wrong',
                variant: 'destructive',
            })
        },
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">Create Booking Type</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Booking Type</DialogTitle>
                    <DialogDescription>
                        Define a new type of appointment visitors can book.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="slug">Slug</Label>
                            <Input
                                id="slug"
                                placeholder="quick-chat"
                                {...register('slug')}
                            />
                            {errors.slug && (
                                <p className="text-sm text-destructive">{errors.slug.message}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="Quick Chat"
                                {...register('title')}
                            />
                            {errors.title && (
                                <p className="text-sm text-destructive">{errors.title.message}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="A quick 15-min chat"
                                {...register('description')}
                            />
                            {errors.description && (
                                <p className="text-sm text-destructive">{errors.description.message}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="durationSlots">
                                Duration (in slots &middot; 15 min each)
                            </Label>
                            <Input
                                id="durationSlots"
                                type="number"
                                min={1}
                                {...register('durationSlots')}
                            />
                            {errors.durationSlots && (
                                <p className="text-sm text-destructive">{errors.durationSlots.message}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
