import {useNavigate} from 'react-router-dom'
import {Button} from '@/components/ui/button'
import {Calendar} from 'lucide-react'

export function HomePage() {
    const navigate = useNavigate()

    return (
        <div className="text-center space-y-8">
            <section className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Book time with us</h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Choose a meeting type and pick an available slot that works for you.
                </p>
                <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate('/book')}>
                    <Calendar className="h-4 w-4 mr-2"/>
                    Book Now
                </Button>
            </section>
        </div>
    )
}