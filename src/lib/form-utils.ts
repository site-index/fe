import { z } from 'zod'

const ZERO_NUMBER = 0

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

function parseOptionalDecimalToZero(value: string): number {
    if (value.trim() === '') {
        return ZERO_NUMBER
    }
    const parsed = toNum(value)
    return Number.isFinite(parsed) ? parsed : ZERO_NUMBER
}

/** Compute per-unit breakdown sum from MAT/MO/EQ string fields. */
export function breakdownSumFromStrings(values: {
    amountMaterialStr: string
    amountLaborStr: string
    amountEquipmentStr: string
}): number {
    return (
        parseOptionalDecimalToZero(values.amountMaterialStr) +
        parseOptionalDecimalToZero(values.amountLaborStr) +
        parseOptionalDecimalToZero(values.amountEquipmentStr)
    )
}

/** Breakdown is active when at least one per-unit amount is > 0. */
export function isBreakdownActiveFromStrings(values: {
    amountMaterialStr: string
    amountLaborStr: string
    amountEquipmentStr: string
}): boolean {
    return breakdownSumFromStrings(values) > ZERO_NUMBER
}

/** Zod refinement: non-empty string that parses to a number ≥ 0. */
export const nonNegStr = z
    .string()
    .trim()
    .refine(
        (s) =>
            s !== '' &&
            Number.isFinite(Number(s.replace(',', '.'))) &&
            Number(s.replace(',', '.')) >= ZERO_NUMBER,
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
                Number(s.replace(',', '.')) >= ZERO_NUMBER),
        'Tiene que ser un número ≥ 0'
    )
