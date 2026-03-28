export type BudgetLineRow = {
    id: string
    trade: string
    description: string
    unit: string
    quantity: number
    unitPrice: number
    total: number
    flaky: boolean
    mixDesignId: string | null
    mixDesignName: string | null
    categoryBreakdown: {
        materials: number
        labor: number
        equipment: number
    }
    unitPriceStored: number | null
    amountMaterial: number
    amountLabor: number
    amountEquipment: number
}
