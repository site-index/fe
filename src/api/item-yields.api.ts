import { apiFetch } from '@/lib/api'
import type { ItemYield, ItemYieldOption } from '@/types/item-yield'

import type { ApiContext } from './api-context'

export type CreateItemYieldInput = {
    workCategoryId: string
    name: string
    description?: string
    measureUnitId: string
    basisOutputQty?: number
    components?: ItemYieldComponentsInput
}

export type ItemYieldLineInput = {
    resourceId: string
    purchaseMeasureUnitId?: string | null
    purchaseLabel?: string | null
    purchaseMappingStatus?: 'MAPPED' | 'UNMAPPED'
    baseQuantity: number
    yieldPerPurchase: number
    wastePercent: number
    scalingMode: 'VARIABLE' | 'FIXED' | 'STEP'
    stepSize: number | null
    stepDriverKey: string | null
    stepDriverSourceKey: string | null
}

export type ItemYieldComponentsInput = {
    linkedItems: string[]
    lines: ItemYieldLineInput[]
}

export type PatchItemYieldInput = {
    workCategoryId: string
    name: string
    description?: string
    measureUnitMode: 'INHERIT' | 'OVERRIDE'
    measureUnitId?: string
    basisOutputQty?: number
    components: ItemYieldComponentsInput
}

function createItemYieldRequestBody(
    input: CreateItemYieldInput
): PatchItemYieldInput {
    const components = input.components ?? {
        linkedItems: [],
        lines: [],
    }
    return {
        workCategoryId: input.workCategoryId,
        name: input.name,
        ...(input.description ? { description: input.description } : {}),
        basisOutputQty: input.basisOutputQty ?? 1,
        measureUnitMode: 'OVERRIDE' as const,
        measureUnitId: input.measureUnitId,
        components,
    }
}

export function getProjectItemYields(
    projectId: string,
    ctx: ApiContext
): Promise<ItemYield[]> {
    return apiFetch<ItemYield[]>(`/v1/projects/${projectId}/item-yields`, {
        token: ctx.token,
        studioSlug: ctx.studioSlug,
    })
}

export function getProjectItemYieldOptions(
    projectId: string,
    ctx: ApiContext
): Promise<ItemYieldOption[]> {
    return apiFetch<ItemYieldOption[]>(
        `/v1/projects/${projectId}/item-yields`,
        {
            token: ctx.token,
            studioSlug: ctx.studioSlug,
        }
    )
}

export function createProjectItemYield(
    projectId: string,
    input: CreateItemYieldInput,
    ctx: ApiContext
): Promise<ItemYield> {
    return apiFetch<ItemYield>(`/v1/projects/${projectId}/item-yields`, {
        method: 'POST',
        body: createItemYieldRequestBody(input),
        token: ctx.token,
        studioSlug: ctx.studioSlug,
    })
}

export function patchProjectItemYield(
    projectId: string,
    itemYieldId: string,
    input: PatchItemYieldInput,
    ctx: ApiContext
): Promise<ItemYield> {
    return apiFetch<ItemYield>(
        `/v1/projects/${projectId}/item-yields/${itemYieldId}`,
        {
            method: 'PATCH',
            body: input,
            token: ctx.token,
            studioSlug: ctx.studioSlug,
        }
    )
}
