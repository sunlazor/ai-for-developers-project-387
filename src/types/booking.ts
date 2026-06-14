// Domain types are DERIVED from the API contract, not hand-written.
//
// `src/types/openapi.ts` is generated from `tsp-output/openapi/openapi.yaml`
// (itself compiled from `main.tsp`) via `npm run typegen`. This module is the
// stable, ergonomic public surface: it re-exports the spec's component schemas
// under flat names so callers can keep writing `BookingType` instead of
// `components['schemas']['BookingType']`.
//
// To change the shape of any model, edit `main.tsp` and recompile
// (`npm run typespec:compile`, which also runs `typegen`). Do not edit these
// types by hand.

import type {components} from '@/types/openapi'

type Schemas = components['schemas']

export type BookingType = Schemas['BookingType']
export type CreateBookingType = Schemas['CreateBookingType']
export type UpdateBookingType = Schemas['UpdateBookingType']

export type SlotState = Schemas['SlotState']
export type AvailableSlot = Schemas['AvailableSlot']
export type HostSlot = Schemas['HostSlot']
export type AvailabilityEdit = Schemas['AvailabilityEdit']

export type Booking = Schemas['Booking']
export type CreateBooking = Schemas['CreateBooking']

/**
 * The known `code` values from the API's error schemas (`NotFound`, `Conflict`,
 * `Unprocessable`, `Unauthorized`), all of which share a `{code, message}` shape.
 */
export type ApiErrorCode =
    | Schemas['NotFound']['code']
    | Schemas['Conflict']['code']
    | Schemas['Unprocessable']['code']
    | Schemas['Unauthorized']['code']

/**
 * The error envelope the client surfaces: the spec's `{code, message}` plus the
 * HTTP `statusCode` the client attaches. `code` is `string` rather than the
 * `ApiErrorCode` union because the client also emits a generic fallback code.
 */
export interface ApiError {
    statusCode: number
    code: string
    message: string
}
