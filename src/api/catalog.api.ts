import { apiFetch } from '@/lib/api'
import type { MeasureUnitRow } from '@/types/measure-unit'
import type { PurchaseMappingStatus } from '@/types/purchase-mapping'
import type { ResourceKind } from '@/types/resource-kind'
import type { WorkCategoryRow } from '@/types/work-category'

import type { ApiContext } from './api-context'

export type StudioCatalogItemDefaultRow = {
    catalogItemId: string
    itemTypeStableId: string
    code: string
    name: string
    workCategoryId: string
    workCategoryName: string
    sortOrder: number
    measureUnitMode: 'INHERIT' | 'OVERRIDE'
    measureUnit: { id: string; code: string; name: string } | null
    basisOutputQty: number
    linkedItems: string[]
    lines: Array<{
        resourceId: string
        resourceName: string
        resourceKind: ResourceKind
        baseMeasureUnit: { id: string; code: string; name: string }
        purchaseMeasureUnit: { id: string; code: string; name: string } | null
        purchaseMeasureUnitId?: string | null
        purchaseLabel?: string | null
        purchaseMappingStatus?: PurchaseMappingStatus
        baseQuantity: number
        yieldPerPurchase: number
        wastePercent: number
        scalingMode: 'VARIABLE' | 'FIXED' | 'STEP'
        stepSize: number | null
        stepDriverKey: string | null
        stepDriverSourceKey: string | null
    }>
    studioDefaultUpdatedAt: string | null
}

export type PatchStudioCatalogItemInput = {
    measureUnitMode: 'INHERIT' | 'OVERRIDE'
    measureUnitId?: string
    basisOutputQty?: number
    components: {
        linkedItems: string[]
        lines: Array<{
            resourceId: string
            purchaseMeasureUnitId?: string | null
            purchaseLabel?: string | null
            purchaseMappingStatus?: PurchaseMappingStatus
            baseQuantity: number
            yieldPerPurchase: number
            wastePercent: number
            scalingMode: 'VARIABLE' | 'FIXED' | 'STEP'
            stepSize: number | null
            stepDriverKey: string | null
            stepDriverSourceKey: string | null
        }>
    }
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

export function patchStudioCatalogItem(
    catalogItemId: string,
    input: PatchStudioCatalogItemInput,
    ctx: ApiContext
): Promise<StudioCatalogItemDefaultRow> {
    return apiFetch<StudioCatalogItemDefaultRow>(
        `/v1/studio-catalog-items/${catalogItemId}`,
        {
            method: 'PATCH',
            body: input,
            token: ctx.token,
            studioSlug: ctx.studioSlug,
        }
    )
}
