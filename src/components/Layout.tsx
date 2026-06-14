import {Outlet, Link} from 'react-router-dom'
import {CalendarDays, Shield} from 'lucide-react'
import {Button} from '@/components/ui/button'

export function Layout() {
    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
                        <CalendarDays className="h-6 w-6 text-primary"/>
                        Calendai
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/host">
                                <Shield className="h-4 w-4 mr-1"/>
                                Host
                            </Link>
                        </Button>
                    </nav>
                </div>
            </header>
            <main className="container mx-auto px-4 py-8">
                <Outlet/>
            </main>
        </div>
    )
}