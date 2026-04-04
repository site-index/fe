export type ItemYieldLine = {
    resourceId: string
    resourceName: string
    resourceKind: 'MATERIAL' | 'LABOR' | 'EQUIPMENT'
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
    catalogItemApprovalStatus: 'ACTIVE' | 'PENDING_APPROVAL' | null
}

export type ItemYieldOption = Pick<
    ItemYield,
    'id' | 'name' | 'workCategoryId' | 'workCategoryName'
>
