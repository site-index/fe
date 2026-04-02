import { apiFetch } from '@/lib/api'
import type { ItemYield, ItemYieldOption } from '@/types/item-yield'

import type { ApiContext } from './api-context'

export type CreateItemYieldInput = {
    workCategoryId: string
    name: string
    description?: string
    measureUnitId: string
}

function createItemYieldRequestBody(input: CreateItemYieldInput) {
    return {
        workCategoryId: input.workCategoryId,
        name: input.name,
        measureUnitMode: 'OVERRIDE' as const,
        measureUnitId: input.measureUnitId,
        ...(input.description ? { description: input.description } : {}),
        components: {
            linkedItems: [],
            lines: [],
        },
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
