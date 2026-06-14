import {type ClassValue, clsx} from 'clsx'
import {twMerge} from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatSlotStart(slotStart: string): Date {
    return new Date(slotStart)
}

export function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
    })
}

export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    })
}

export function formatDateShort(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    })
}

export function getMondayOfWeek(date: Date): Date {
    const d = new Date(date)
    const day = d.getUTCDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setUTCDate(d.getUTCDate() + diff)
    d.setUTCHours(0, 0, 0, 0)
    return d
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
    const monday = getMondayOfWeek(date)
    const sunday = new Date(monday)
    sunday.setUTCDate(monday.getUTCDate() + 6)
    sunday.setUTCHours(23, 59, 59, 999)
    return {start: monday, end: sunday}
}

export function getWeekDays(monday: Date): Date[] {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setUTCDate(monday.getUTCDate() + i)
        days.push(d)
    }
    return days
}

export function formatDateShortWithWeekday(date: Date): string {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    })
}

export type TimeBand = 'night' | 'morning' | 'day' | 'evening'

export function getTimeBand(hours: number): TimeBand {
    if (hours >= 6 && hours < 12) return 'morning'
    if (hours >= 12 && hours < 18) return 'day'
    if (hours >= 18 && hours < 24) return 'evening'
    return 'night'
}

export const TIME_BAND_ORDER: TimeBand[] = ['morning', 'day', 'evening', 'night']

export function timeBandLabel(band: TimeBand): string {
    switch (band) {
        case 'morning':
            return 'Morning'
        case 'day':
            return 'Day'
        case 'evening':
            return 'Evening'
        case 'night':
            return 'Night'
    }
}

export function generateSlotStarts(start: Date, end: Date): string[] {
    const slots: string[] = []
    const current = new Date(start)
    current.setUTCMinutes(0, 0, 0)
    while (current <= end) {
        const minutes = current.getUTCMinutes()
        const roundedMinutes = Math.floor(minutes / 15) * 15
        current.setUTCMinutes(roundedMinutes, 0, 0)
        slots.push(current.toISOString().replace(/\.\d{3}Z$/, 'Z'))
        current.setUTCMinutes(current.getUTCMinutes() + 15)
    }
    return slots
}