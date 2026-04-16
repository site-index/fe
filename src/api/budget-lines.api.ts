import { apiFetch } from '@/lib/api'
import type { BudgetLineRow } from '@/types/budget-line'

import type { ApiContext } from './api-context'
import type { ItemYieldComponentsInput } from './item-yields.api'

export type BudgetLineParameterValueInput = {
    parameterDefinitionId: string
    valueType: 'DECIMAL' | 'INTEGER' | 'BOOLEAN' | 'TEXT'
    decimalValue?: number | null
    integerValue?: number | null
    booleanValue?: boolean | null
    textValue?: string | null
}

export type CreateBudgetLineInput = {
    description: string
    itemYieldId?: string
    catalogItemId?: string
    yieldComponents?: ItemYieldComponentsInput
    workCategoryId?: string
    measureUnitId?: string
    quantity?: number
    unitPrice?: number
    amountMaterial?: number
    amountLabor?: number
    amountEquipment?: number
    parameterValues?: BudgetLineParameterValueInput[]
}

export type PatchBudgetLinePricingInput = {
    quantity: number | null
    amountMaterial?: number
    amountLabor?: number
    amountEquipment?: number
}

export type PatchBudgetLineInput = {
    description?: string
    itemYieldId?: string | null
    workCategoryId?: string | null
    measureUnitId?: string | null
    quantity?: number | null
    unitPrice?: number | null
    amountMaterial?: number
    amountLabor?: number
    amountEquipment?: number
    parameterValues?: BudgetLineParameterValueInput[] | null
}

function createBudgetLineBody(
    input: CreateBudgetLineInput
): Record<string, unknown> {
    return {
        description: input.description,
        ...Object.fromEntries(
            Object.entries({
                itemYieldId: input.itemYieldId || undefined,
                catalogItemId: input.catalogItemId || undefined,
                yieldComponents: input.yieldComponents,
                workCategoryId: input.workCategoryId || undefined,
                measureUnitId: input.measureUnitId || undefined,
                quantity: input.quantity,
                unitPrice: input.unitPrice,
                amountMaterial: input.amountMaterial,
                amountLabor: input.amountLabor,
                amountEquipment: input.amountEquipment,
                parameterValues: input.parameterValues,
            }).filter(([, value]) => value !== undefined)
        ),
    }
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

export function patchProjectBudgetLine(
    projectId: string,
    budgetLineId: string,
    input: PatchBudgetLineInput,
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
