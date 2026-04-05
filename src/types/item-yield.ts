import type { ResourceKind } from './resource-kind'

export const CATALOG_ITEM_APPROVAL_STATUSES = [
    'ACTIVE',
    'PENDING_APPROVAL',
] as const
export type CatalogItemApprovalStatus =
    (typeof CATALOG_ITEM_APPROVAL_STATUSES)[number]

export type ItemYieldLine = {
    resourceId: string
    resourceName: string
    resourceKind: ResourceKind
    baseMeasureUnit: {
        id: string
        code: string
        name: string
    }
    commercialMeasureUnit: {
        id: string
        code: string
        name: string
    }
    quantity: number
}

export type ItemYield = {
    id: string
    workCategoryId: string
    workCategoryName: string
    name: string
    components: ItemYieldLine[]
    linkedItems: string[]
    /** Present when this row is a snapshot of a global catalog item. */
    catalogItemId: string | null
    catalogItemApprovalStatus: CatalogItemApprovalStatus | null
}

export type ItemYieldOption = Pick<
    ItemYield,
    'id' | 'name' | 'workCategoryId' | 'workCategoryName'
>
