export type BudgetLineRow = {
    id: string
    workCategoryId: string | null
    workCategoryName: string
    description: string
    unit: string
    quantity: number
    unitPrice: number
    total: number
    flaky: boolean
    itemYieldId: string | null
    itemYieldName: string | null
    categoryBreakdown: { materials: number; labor: number; equipment: number }
    unitPriceStored: number | null
    amountMaterial: number
    amountLabor: number
    amountEquipment: number
}
