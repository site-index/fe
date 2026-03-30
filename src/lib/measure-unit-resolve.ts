import type { MeasureUnitRow } from '@/types/measure-unit'

function normalizeForCompare(s: string): string {
    return s.trim().toLowerCase()
}

/**
 * Map free-text `components.outputUnit` (yields / studio defaults) to a
 * `MeasureUnit` row id when possible.
 */
export function resolveOutputUnitToMeasureUnitId(
    outputUnit: string,
    measureUnits: MeasureUnitRow[]
): string | null {
    const raw = outputUnit.trim()
    if (raw === '') {
        return null
    }

    const aliased =
        normalizeForCompare(raw) === 'un' ? 'unit' : normalizeForCompare(raw)

    const byExactCode = measureUnits.find((u) => u.code === raw)
    if (byExactCode) {
        return byExactCode.id
    }

    const byExactName = measureUnits.find((u) => u.name === raw)
    if (byExactName) {
        return byExactName.id
    }

    const byCodeCi = measureUnits.find(
        (u) => normalizeForCompare(u.code) === aliased
    )
    if (byCodeCi) {
        return byCodeCi.id
    }

    const byNameCi = measureUnits.find(
        (u) => normalizeForCompare(u.name) === aliased
    )
    if (byNameCi) {
        return byNameCi.id
    }

    return null
}
