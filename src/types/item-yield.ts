export type ItemYieldLine = {
    resourceId: string
    resourceName: string
    resourceKind: 'MATERIAL' | 'LABOR' | 'EQUIPMENT'
    baseMeasureUnit: {
        id: string
        code: string
        name: string
    }
    purchaseMeasureUnit: {
        id: string
        code: string
        name: string
    } | null
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

export type ItemYieldMeasureUnit = {
    id: string
    code: string
    name: string
}

export type ItemYield = {
    id: string
    workCategoryId: string
    workCategoryName: string
    name: string
    description: string
    basisOutputQty: number
    measureUnitMode: 'INHERIT' | 'OVERRIDE'
    measureUnit: ItemYieldMeasureUnit | null
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
