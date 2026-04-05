import { apiFetch } from '@/lib/api'
import type { ResourceKind } from '@/types/resource-kind'

import type { ApiContext } from './api-context'

export type ResourceRow = {
    id: string
    code: string
    name: string
    kind: ResourceKind
    baseMeasureUnit: { id: string; code: string; name: string }
    commercialMeasureUnit: { id: string; code: string; name: string }
}

export type ResourcePriceRow = {
    resourceId: string
    resourceCode: string
    resourceName: string
    resourceKind: ResourceKind
    baseMeasureUnit: { id: string; code: string; name: string }
    measureUnit: { id: string; code: string; name: string }
    unitPrice: number
    currency: string
    effectiveAt: string
}

export type ProjectResourceDemandRow = {
    resourceId: string
    code: string
    name: string
    kind: ResourceKind
    measureUnit: { id: string; code: string; name: string }
    requiredQuantity: number
    estimatedUnitCost: number
    estimatedTotalCost: number
}

export function getResources(ctx: ApiContext): Promise<ResourceRow[]> {
    return apiFetch<ResourceRow[]>('/v1/resources', {
        token: ctx.token,
        studioSlug: ctx.studioSlug,
    })
}

export function getResourcePrices(
    ctx: ApiContext
): Promise<ResourcePriceRow[]> {
    return apiFetch<ResourcePriceRow[]>('/v1/resource-prices', {
        token: ctx.token,
        studioSlug: ctx.studioSlug,
    })
}

export function setResourcePrice(
    resourceId: string,
    input: {
        measureUnitId: string
        unitPrice: number
        currency?: string
        effectiveAt?: string
    },
    ctx: ApiContext
): Promise<ResourcePriceRow> {
    return apiFetch<ResourcePriceRow>(`/v1/resources/${resourceId}/prices`, {
        method: 'POST',
        body: input,
        token: ctx.token,
        studioSlug: ctx.studioSlug,
    })
}

export function patchResourceCommercialUnit(
    resourceId: string,
    commercialMeasureUnitId: string,
    ctx: ApiContext
): Promise<ResourceRow> {
    return apiFetch<ResourceRow>(
        `/v1/resources/${resourceId}/commercial-unit`,
        {
            method: 'PATCH',
            body: { commercialMeasureUnitId },
            token: ctx.token,
            studioSlug: ctx.studioSlug,
        }
    )
}

export function getProjectResourceDemand(
    projectId: string,
    ctx: ApiContext
): Promise<ProjectResourceDemandRow[]> {
    return apiFetch<ProjectResourceDemandRow[]>(
        `/v1/projects/${projectId}/resource-demand`,
        {
            token: ctx.token,
            studioSlug: ctx.studioSlug,
        }
    )
}
