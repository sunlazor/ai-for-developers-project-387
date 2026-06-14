import {BookingType} from '@/types/booking'
import {Button} from '@/components/ui/button'
import {Clock} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'

interface BookingTypeSelectorProps {
    bookingTypes: BookingType[]
    onSelect: (slug: string) => void
    onClose: () => void
}

export function BookingTypeSelector({
                                        bookingTypes,
                                        onSelect,
                                        onClose,
                                    }: BookingTypeSelectorProps) {
    const activeTypes = bookingTypes.filter((bt) => bt.active)

    const handleSelect = (slug: string) => {
        onSelect(slug)
        onClose()
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Choose a meeting type</DialogTitle>
                    <DialogDescription>
                        Select the type of meeting you'd like to book.
                    </DialogDescription>
                </DialogHeader>

                {activeTypes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <span className="text-6xl mb-4">🏖️</span>
                        <p className="text-lg font-medium">Host on weekation</p>
                        <p className="text-muted-foreground mt-1">
                            No meeting types are available right now.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3 mt-4">
                        {activeTypes.map((bt) => (
                            <Button
                                key={bt.slug}
                                className="w-full justify-start text-left h-auto py-4 gap-4"
                                onClick={() => handleSelect(bt.slug)}
                            >
                                <div className="flex-1">
                                    <p className="font-medium">{bt.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {bt.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4"/>
                                    <span>{bt.durationSlots * 15} minutes</span>
                                </div>
                            </Button>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}