import {readFileSync, writeFileSync} from 'node:fs';
import yaml from 'js-yaml';

const OPENAPI_PATH = 'tsp-output/openapi/openapi.yaml';

const spec = yaml.load(readFileSync(OPENAPI_PATH, 'utf8'));

// -------------------------------------------------------------------------
// Date helpers — all times UTC, Monday-anchored.
// -------------------------------------------------------------------------

function pad(n) {
    return String(n).padStart(2, '0');
}

/** ISO day-of-week: Mon=1, Tue=2, ..., Sun=7 */
function isoDow(date) {
    const d = date.getUTCDay();
    return d === 0 ? 7 : d;
}

/** Return the Monday of the current week (UTC). */
function getCurrentMonday() {
    const now = new Date();
    // Clamp to UTC
    const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dow = isoDow(utc);
    utc.setUTCDate(utc.getUTCDate() - (dow - 1));
    utc.setUTCHours(0, 0, 0, 0);
    return utc;
}

/**
 * Return `YYYY-MM-DDTHH:mm:00Z` for a given Monday offset (days from Monday)
 * and time in hours/minutes.
 */
function isoDate(monday, dayOffset, hour, minute) {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    d.setUTCHours(hour, minute, 0, 0);
    return d.toISOString().replace(/\.000Z$/, 'Z');
}

/**
 * Return `YYYY-MM-DD-HH-mm` booking id for a given Monday offset + time.
 */
function bookingId(monday, dayOffset, hour, minute) {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(hour)}-${pad(minute)}`;
}

// -------------------------------------------------------------------------
// Slot patterns — day offset from Monday → array of {hour, minute} starts.
// Also state patterns for host view.
// -------------------------------------------------------------------------

const MONDAY = getCurrentMonday();

// --- Available Slots (Visitor view) ---
// Each entry: {dayOffset, hour, minute}
const availableSlotDefs = [
    // Tue (offset 1) — 60min block (09:00-09:45) + isolated 15min (10:15)
    {d: 1, h: 9, m: 0}, {d: 1, h: 9, m: 15}, {d: 1, h: 9, m: 30}, {d: 1, h: 9, m: 45},
    {d: 1, h: 10, m: 15},
    // Wed (offset 2) — 30min block (14:00-14:15) + 60min block (15:00-15:45)
    {d: 2, h: 14, m: 0}, {d: 2, h: 14, m: 15},
    {d: 2, h: 15, m: 0}, {d: 2, h: 15, m: 15}, {d: 2, h: 15, m: 30}, {d: 2, h: 15, m: 45},
    // Thu (offset 3) — 60min block (10:00-10:45)
    {d: 3, h: 10, m: 0}, {d: 3, h: 10, m: 15}, {d: 3, h: 10, m: 30}, {d: 3, h: 10, m: 45},
    // Fri (offset 4) — 15min (13:00) + 60min (14:00-14:45)
    {d: 4, h: 13, m: 0},
    {d: 4, h: 14, m: 0}, {d: 4, h: 14, m: 15}, {d: 4, h: 14, m: 30}, {d: 4, h: 14, m: 45},
    // Mon (offset 7) — 60min block (09:00-09:45)
    {d: 7, h: 9, m: 0}, {d: 7, h: 9, m: 15}, {d: 7, h: 9, m: 30}, {d: 7, h: 9, m: 45},
    // Tue (offset 8) — 45min block (09:00-09:30) + isolated 15min (10:00)
    {d: 8, h: 9, m: 0}, {d: 8, h: 9, m: 15}, {d: 8, h: 9, m: 30},
    {d: 8, h: 10, m: 0},
    // Wed (offset 9) — 60min block (14:00-14:45)
    {d: 9, h: 14, m: 0}, {d: 9, h: 14, m: 15}, {d: 9, h: 14, m: 30}, {d: 9, h: 14, m: 45},
];

const availableSlots = availableSlotDefs.map(({d, h, m}) => ({
    start: isoDate(MONDAY, d, h, m),
}));

// --- Host Slots (with states) ---
// Each entry: {dayOffset, hour, minute, state}
const hostSlotDefs = [
    // Tue (offset 1)
    {d: 1, h: 9, m: 0, s: 'available'}, {d: 1, h: 9, m: 15, s: 'available'}, {d: 1, h: 9, m: 30, s: 'available'}, {
        d: 1,
        h: 9,
        m: 45,
        s: 'available'
    },
    {d: 1, h: 10, m: 0, s: 'unavailable'},
    {d: 1, h: 10, m: 15, s: 'available'},
    {d: 1, h: 10, m: 30, s: 'booked'}, {d: 1, h: 10, m: 45, s: 'booked'},
    // Wed (offset 2)
    {d: 2, h: 14, m: 0, s: 'available'}, {d: 2, h: 14, m: 15, s: 'available'},
    {d: 2, h: 14, m: 30, s: 'unavailable'}, {d: 2, h: 14, m: 45, s: 'unavailable'},
    {d: 2, h: 15, m: 0, s: 'available'}, {d: 2, h: 15, m: 15, s: 'available'}, {
        d: 2,
        h: 15,
        m: 30,
        s: 'available'
    }, {d: 2, h: 15, m: 45, s: 'available'},
    // Thu (offset 3)
    {d: 3, h: 10, m: 0, s: 'available'}, {d: 3, h: 10, m: 15, s: 'available'}, {
        d: 3,
        h: 10,
        m: 30,
        s: 'available'
    }, {d: 3, h: 10, m: 45, s: 'available'},
    // Fri (offset 4)
    {d: 4, h: 13, m: 0, s: 'available'},
    {d: 4, h: 13, m: 15, s: 'unavailable'}, {d: 4, h: 13, m: 30, s: 'unavailable'}, {
        d: 4,
        h: 13,
        m: 45,
        s: 'unavailable'
    },
    {d: 4, h: 14, m: 0, s: 'booked'}, {d: 4, h: 14, m: 15, s: 'booked'}, {d: 4, h: 14, m: 30, s: 'booked'}, {
        d: 4,
        h: 14,
        m: 45,
        s: 'booked'
    },
    // Mon (offset 7)
    {d: 7, h: 9, m: 0, s: 'available'}, {d: 7, h: 9, m: 15, s: 'available'}, {d: 7, h: 9, m: 30, s: 'available'}, {
        d: 7,
        h: 9,
        m: 45,
        s: 'available'
    },
    // Tue (offset 8)
    {d: 8, h: 9, m: 0, s: 'available'}, {d: 8, h: 9, m: 15, s: 'available'}, {d: 8, h: 9, m: 30, s: 'available'},
    {d: 8, h: 9, m: 45, s: 'unavailable'},
    {d: 8, h: 10, m: 0, s: 'available'},
    {d: 8, h: 10, m: 15, s: 'unavailable'}, {d: 8, h: 10, m: 30, s: 'unavailable'}, {
        d: 8,
        h: 10,
        m: 45,
        s: 'unavailable'
    },
    // Wed (offset 9)
    {d: 9, h: 14, m: 0, s: 'available'}, {d: 9, h: 14, m: 15, s: 'available'}, {
        d: 9,
        h: 14,
        m: 30,
        s: 'available'
    }, {d: 9, h: 14, m: 45, s: 'available'},
];

const hostSlots = hostSlotDefs.map(({d, h, m, s}) => ({
    start: isoDate(MONDAY, d, h, m),
    state: s,
}));

// --- Bookings ---
const bookingDefs = [
    // Tue of week 1 at 10:30, intro-call
    {d: 1, h: 10, m: 30, slug: 'intro-call', name: 'Alice Johnson', email: 'alice@example.com'},
    // Fri of week 1 at 14:00, deep-dive
    {d: 4, h: 14, m: 0, slug: 'deep-dive', name: 'Bob Smith', email: 'bob@example.com'},
];

const bookings = bookingDefs.map(({d, h, m, slug, name, email}) => ({
    id: bookingId(MONDAY, d, h, m),
    bookingTypeSlug: slug,
    startSlot: isoDate(MONDAY, d, h, m),
    visitorName: name,
    visitorEmail: email,
}));

// -------------------------------------------------------------------------
// Inject examples into the OpenAPI spec.
// -------------------------------------------------------------------------

const paths = spec.paths;

if (paths['/api/booking-types']?.get?.responses?.['200']?.content?.['application/json']) {
    const bookingTypes = [
        {
            slug: 'intro-call',
            title: 'Intro Call',
            description: 'A quick 30-minute introductory call to discuss your needs.',
            durationSlots: 2,
            active: true
        },
        {
            slug: 'deep-dive',
            title: 'Deep Dive Session',
            description: 'A 60-minute deep dive into your project requirements.',
            durationSlots: 4,
            active: true
        },
        {
            slug: 'quick-chat',
            title: 'Quick Chat',
            description: 'A brief 15-minute chat for quick questions.',
            durationSlots: 1,
            active: true
        },
        {
            slug: 'workshop',
            title: 'Workshop',
            description: 'A 90-minute hands-on workshop session.',
            durationSlots: 6,
            active: false
        },
    ];
    paths['/api/booking-types'].get.responses['200'].content['application/json'].example = bookingTypes;
}

if (paths['/api/availability']?.get?.responses?.['200']?.content?.['application/json']) {
    paths['/api/availability'].get.responses['200'].content['application/json'].example = availableSlots;
}

if (paths['/api/host/availability']?.get?.responses?.['200']?.content?.['application/json']) {
    paths['/api/host/availability'].get.responses['200'].content['application/json'].example = hostSlots;
}

if (paths['/api/host/bookings']?.get?.responses?.['200']?.content?.['application/json']) {
    paths['/api/host/bookings'].get.responses['200'].content['application/json'].example = bookings;
}

writeFileSync(OPENAPI_PATH, yaml.dump(spec, {indent: 2, lineWidth: 120, noRefs: true}));
console.log('✅ Mock examples injected into', OPENAPI_PATH);
