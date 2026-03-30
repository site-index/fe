import { z } from 'zod'

/** Parse a user-typed decimal string (supports comma as decimal separator). */
export function toNum(s: string): number {
    return Number(s.replace(',', '.').trim())
}

/** Format a number as ARS currency. */
export function formatCurrency(value: number): string {
    return value.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
    })
}

/** Zod refinement: non-empty string that parses to a number ≥ 0. */
export const nonNegStr = z
    .string()
    .trim()
    .refine(
        (s) =>
            s !== '' &&
            Number.isFinite(Number(s.replace(',', '.'))) &&
            Number(s.replace(',', '.')) >= 0,
        'Tiene que ser un número ≥ 0'
    )

/** Zod refinement: empty string OR a number ≥ 0. */
export const optionalNonNegStr = z
    .string()
    .trim()
    .refine(
        (s) =>
            s === '' ||
            (Number.isFinite(Number(s.replace(',', '.'))) &&
                Number(s.replace(',', '.')) >= 0),
        'Tiene que ser un número ≥ 0'
    )
