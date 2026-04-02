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
    quantityPerUnit: number
    yieldPerPurchase: number
    wastePercent: number
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
    measureUnitMode: 'INHERIT' | 'OVERRIDE'
    measureUnit: ItemYieldMeasureUnit | null
    components: ItemYieldLine[]
    linkedItems: string[]
    /** Present when this row is a snapshot of a global catalog item. */
    catalogItemId: string | null
}

export type ItemYieldOption = Pick<
    ItemYield,
    'id' | 'name' | 'workCategoryId' | 'workCategoryName'
>
