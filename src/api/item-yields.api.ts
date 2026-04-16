import { apiFetch } from '@/lib/api'
import type {
    ItemYield,
    ItemYieldOption,
    YieldLineBillingMode,
} from '@/types/item-yield'

import type { ApiContext } from './api-context'

export type CreateItemYieldInput = {
    catalogItemId: string
    components?: ItemYieldComponentsInput
}

export type ItemYieldLineInput = {
    resourceId: string
    quantity: number
    billingMode: YieldLineBillingMode
    customDriverKey?: string | null
}

export type ItemYieldComponentsInput = {
    linkedItems: string[]
    lines: ItemYieldLineInput[]
}

export type PatchItemYieldInput = {
    components: ItemYieldComponentsInput
}

type CreateItemYieldRequestBody = {
    catalogItemId: string
    components: ItemYieldComponentsInput
}

function createItemYieldRequestBody(
    input: CreateItemYieldInput
): CreateItemYieldRequestBody {
    const components = input.components ?? {
        linkedItems: [],
        lines: [],
    }
    return {
        catalogItemId: input.catalogItemId,
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
