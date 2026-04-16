export type BudgetLineRow = {
    id: string
    workCategoryId: string | null
    workCategoryNumber: number | null
    itemNumber: number
    workCategoryName: string
    description: string
    measureUnit: { id: string; code: string; name: string } | null
    quantity: number
    unitPrice: number
    total: number
    flaky: boolean
    itemYieldId: string | null
    itemYieldName: string | null
    catalogItemId: string | null
    categoryBreakdown: { materials: number; labor: number; equipment: number }
    unitPriceStored: number | null
    amountMaterial: number
    amountLabor: number
    amountEquipment: number
    itemTypeStableId: string | null
    usesUnitPriceOverride: boolean
    parameterValues?: Array<{
        parameterDefinitionId: string
        key: string
        label: string
        valueType: 'DECIMAL' | 'INTEGER' | 'BOOLEAN' | 'TEXT'
        decimalValue: number | null
        integerValue: number | null
        booleanValue: boolean | null
        textValue: string | null
    }>
    warnings?: string[]
}
