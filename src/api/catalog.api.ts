import { apiFetch } from '@/lib/api'
import type { MeasureUnitRow } from '@/types/measure-unit'
import type { WorkCategoryRow } from '@/types/work-category'

import type { ApiContext } from './api-context'

export type StudioCatalogItemDefaultRow = {
    catalogItemId: string
    code: string
    name: string
    workCategoryId: string
    workCategoryName: string
    sortOrder: number
    measureUnitMode: 'INHERIT' | 'OVERRIDE'
    measureUnit: { id: string; code: string; name: string } | null
    linkedItems: string[]
    lines: Array<{
        id: string
        material: string
        unit: string
        quantityPerUnit: number
        purchaseUnit: string
        yieldPerPurchase: number
        wastePercent: number
    }>
    studioDefaultUpdatedAt: string | null
}

export function getWorkCategories(ctx: ApiContext): Promise<WorkCategoryRow[]> {
    return apiFetch<WorkCategoryRow[]>('/v1/work-categories', {
        token: ctx.token,
        studioSlug: ctx.studioSlug,
    })
}

export function getMeasureUnits(ctx: ApiContext): Promise<MeasureUnitRow[]> {
    return apiFetch<MeasureUnitRow[]>('/v1/measure-units', {
        token: ctx.token,
        studioSlug: ctx.studioSlug,
    })
}

export function getStudioCatalogItems(
    ctx: ApiContext
): Promise<StudioCatalogItemDefaultRow[]> {
    return apiFetch<StudioCatalogItemDefaultRow[]>('/v1/studio-catalog-items', {
        token: ctx.token,
        studioSlug: ctx.studioSlug,
    })
}
