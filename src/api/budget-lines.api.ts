import { apiFetch } from '@/lib/api'
import type { BudgetLineRow } from '@/types/budget-line'

import type { ApiContext } from './api-context'

export type CreateBudgetLineInput = {
    description: string
    itemYieldId?: string
    catalogItemId?: string
    workCategoryId?: string
    measureUnitId?: string
    quantity?: number
    unitPrice?: number
    amountMaterial?: number
    amountLabor?: number
    amountEquipment?: number
}

export type PatchBudgetLinePricingInput = {
    quantity: number | null
    amountMaterial?: number
    amountLabor?: number
    amountEquipment?: number
}

function createBudgetLineBody(
    input: CreateBudgetLineInput
): Record<string, unknown> {
    const body: Record<string, unknown> = {
        description: input.description,
    }
    if (input.itemYieldId) body.itemYieldId = input.itemYieldId
    if (input.catalogItemId) body.catalogItemId = input.catalogItemId
    if (input.workCategoryId) body.workCategoryId = input.workCategoryId
    if (input.measureUnitId) body.measureUnitId = input.measureUnitId
    if (input.quantity !== undefined) body.quantity = input.quantity
    if (input.unitPrice !== undefined) body.unitPrice = input.unitPrice
    if (input.amountMaterial !== undefined)
        body.amountMaterial = input.amountMaterial
    if (input.amountLabor !== undefined) body.amountLabor = input.amountLabor
    if (input.amountEquipment !== undefined)
        body.amountEquipment = input.amountEquipment
    return body
}

export function getProjectBudgetLines(
    projectId: string,
    ctx: ApiContext
): Promise<BudgetLineRow[]> {
    return apiFetch<BudgetLineRow[]>(`/v1/projects/${projectId}/budget-lines`, {
        token: ctx.token,
        studioSlug: ctx.studioSlug,
    })
}

export function createProjectBudgetLine(
    projectId: string,
    input: CreateBudgetLineInput,
    ctx: ApiContext
): Promise<BudgetLineRow> {
    return apiFetch<BudgetLineRow>(`/v1/projects/${projectId}/budget-lines`, {
        method: 'POST',
        body: createBudgetLineBody(input),
        token: ctx.token,
        studioSlug: ctx.studioSlug,
    })
}

export function patchProjectBudgetLinePricing(
    projectId: string,
    budgetLineId: string,
    input: PatchBudgetLinePricingInput,
    ctx: ApiContext
): Promise<BudgetLineRow> {
    return apiFetch<BudgetLineRow>(
        `/v1/projects/${projectId}/budget-lines/${budgetLineId}`,
        {
            method: 'PATCH',
            body: input,
            token: ctx.token,
            studioSlug: ctx.studioSlug,
        }
    )
}

export function patchProjectBudgetLineItemYield(
    projectId: string,
    budgetLineId: string,
    itemYieldId: string | null,
    ctx: ApiContext
): Promise<BudgetLineRow> {
    return apiFetch<BudgetLineRow>(
        `/v1/projects/${projectId}/budget-lines/${budgetLineId}`,
        {
            method: 'PATCH',
            body: { itemYieldId },
            token: ctx.token,
            studioSlug: ctx.studioSlug,
        }
    )
}
