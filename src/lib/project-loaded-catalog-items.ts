import type { StudioCatalogItemDefaultRow } from '@/api/catalog.api'
import type { BudgetLineRow } from '@/types/budget-line'
import type { ItemYield } from '@/types/item-yield'

export function loadedCatalogItemIdsFromProjectBudget(args: {
    budgetLines: BudgetLineRow[]
    itemYields: Pick<ItemYield, 'id' | 'catalogItemId'>[]
}): Set<string> {
    const catalogItemIdByYieldId = new Map(
        args.itemYields
            .filter(
                (
                    row
                ): row is Pick<ItemYield, 'id'> & {
                    catalogItemId: string
                } => row.catalogItemId != null
            )
            .map((row) => [row.id, row.catalogItemId] as const)
    )
    const loadedIds = new Set<string>()
    for (const line of args.budgetLines) {
        if (line.catalogItemId != null) {
            loadedIds.add(line.catalogItemId)
            continue
        }
        if (line.itemYieldId == null) {
            continue
        }
        const yieldCatalogItemId = catalogItemIdByYieldId.get(line.itemYieldId)
        if (yieldCatalogItemId != null) {
            loadedIds.add(yieldCatalogItemId)
        }
    }
    return loadedIds
}

export function filterCatalogItemsLoadedInProject(
    catalogItems: StudioCatalogItemDefaultRow[],
    loadedCatalogItemIds: Set<string>
): StudioCatalogItemDefaultRow[] {
    return catalogItems.filter((item) =>
        loadedCatalogItemIds.has(item.catalogItemId)
    )
}
