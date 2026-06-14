import {Routes, Route} from 'react-router-dom'
import {useParams, useNavigate} from 'react-router-dom'
import {useEffect} from 'react'
import {Layout} from '@/components/Layout'
import {HomePage} from '@/pages/HomePage'
import {BookingFlowPage} from '@/pages/BookingFlowPage'
import {HostPage} from '@/pages/HostPage'

function BookingPageRedirect() {
    const {slug, slotId} = useParams<{ slug: string; slotId?: string }>()
    const navigate = useNavigate()
    useEffect(() => {
        if (slug) {
            const params = new URLSearchParams()
            params.set('type', slug)
            if (slotId) params.set('slot', slotId)
            navigate(`/book?${params.toString()}`, {replace: true})
        }
    }, [slug, slotId, navigate])
    return null
}

export default function App() {
    return (
        <Routes>
            <Route element={<Layout/>}>
                <Route path="/" element={<HomePage/>}/>
                <Route path="/book" element={<BookingFlowPage/>}/>
                <Route path="/book/:slug" element={<BookingPageRedirect/>}/>
                <Route path="/book/:slug/:slotId" element={<BookingPageRedirect/>}/>
                <Route path="/host" element={<HostPage/>}/>
            </Route>
        </Routes>
    )
}