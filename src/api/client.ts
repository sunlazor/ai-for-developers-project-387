import type {
    BookingType,
    AvailableSlot,
    HostSlot,
    Booking,
    CreateBooking,
    CreateBookingType,
    UpdateBookingType,
    AvailabilityEdit,
} from '@/types/booking'

const API_BASE = '/api'

async function request<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    })

    if (!res.ok) {
        const error = await res.json().catch(() => ({
            statusCode: res.status,
            code: 'error',
            message: res.statusText,
        }))
        throw error
    }

    if (res.status === 204) return undefined as T
    return res.json()
}

function authHeaders(token: string): HeadersInit {
    return {Authorization: `Bearer ${token}`}
}

// Public endpoints
export const api = {
    listBookingTypes: (): Promise<BookingType[]> =>
        request('/booking-types'),

    getAvailability: (): Promise<AvailableSlot[]> =>
        request('/availability'),

    createBooking: (body: CreateBooking): Promise<Booking> =>
        request('/bookings', {method: 'POST', body: JSON.stringify(body)}),

    // Host endpoints
    listAllBookingTypes: (token: string): Promise<BookingType[]> =>
        request('/host/booking-types', {headers: authHeaders(token)}),

    createBookingType: (body: CreateBookingType, token: string): Promise<BookingType> =>
        request('/host/booking-types', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: authHeaders(token),
        }),

    updateBookingType: (slug: string, body: UpdateBookingType, token: string): Promise<BookingType> =>
        request(`/host/booking-types/${slug}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
            headers: authHeaders(token),
        }),

    deactivateBookingType: (slug: string, token: string): Promise<BookingType> =>
        request(`/host/booking-types/${slug}/deactivate`, {
            method: 'POST',
            headers: authHeaders(token),
        }),

    activateBookingType: (slug: string, token: string): Promise<BookingType> =>
        request(`/host/booking-types/${slug}/activate`, {
            method: 'POST',
            headers: authHeaders(token),
        }),

    getHostAvailability: (token: string): Promise<HostSlot[]> =>
        request('/host/availability', {headers: authHeaders(token)}),

    editAvailability: (body: AvailabilityEdit[], token: string): Promise<HostSlot[]> =>
        request('/host/availability', {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: authHeaders(token),
        }),

    listBookings: (token: string): Promise<Booking[]> =>
        request('/host/bookings', {headers: authHeaders(token)}),

    cancelBooking: (id: string, token: string): Promise<void> =>
        request(`/host/bookings/${id}/cancel`, {
            method: 'POST',
            headers: authHeaders(token),
        }),
}