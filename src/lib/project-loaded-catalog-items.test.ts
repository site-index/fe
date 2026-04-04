import { describe, expect, it } from 'vitest'

import type { StudioCatalogItemDefaultRow } from '@/api/catalog.api'
import type { BudgetLineRow } from '@/types/budget-line'

import {
    filterCatalogItemsLoadedInProject,
    loadedCatalogItemIdsFromProjectBudget,
} from './project-loaded-catalog-items'

function budgetLineRow(overrides: Partial<BudgetLineRow>): BudgetLineRow {
    return {
        id: 'bl-1',
        workCategoryId: null,
        workCategoryNumber: null,
        itemNumber: 1,
        workCategoryName: 'Rubro',
        description: 'Línea',
        measureUnit: null,
        quantity: 1,
        unitPrice: 1,
        total: 1,
        flaky: false,
        itemYieldId: null,
        itemYieldName: null,
        catalogItemId: null,
        categoryBreakdown: { materials: 100, labor: 0, equipment: 0 },
        unitPriceStored: null,
        amountMaterial: 1,
        amountLabor: 0,
        amountEquipment: 0,
        itemTypeStableId: null,
        usesUnitPriceOverride: false,
        ...overrides,
    }
}

function catalogRow(overrides: Partial<StudioCatalogItemDefaultRow>) {
    return {
        catalogItemId: 'cat-1',
        code: 'C1',
        name: 'Catálogo 1',
        workCategoryId: 'wc-1',
        workCategoryName: 'Rubro',
        sortOrder: 1,
        measureUnitMode: 'INHERIT',
        measureUnit: null,
        basisOutputQty: 1,
        linkedItems: [],
        lines: [],
        studioDefaultUpdatedAt: null,
        ...overrides,
    } as StudioCatalogItemDefaultRow
}

describe('project-loaded-catalog-items', () => {
    it('collects catalog ids directly linked in budget lines', () => {
        const ids = loadedCatalogItemIdsFromProjectBudget({
            budgetLines: [budgetLineRow({ catalogItemId: 'cat-1' })],
            itemYields: [],
        })

        expect(ids).toEqual(new Set(['cat-1']))
    })

    it('collects catalog ids from budget-line itemYield links', () => {
        const ids = loadedCatalogItemIdsFromProjectBudget({
            budgetLines: [budgetLineRow({ itemYieldId: 'yield-1' })],
            itemYields: [{ id: 'yield-1', catalogItemId: 'cat-2' }],
        })

        expect(ids).toEqual(new Set(['cat-2']))
    })

    it('filters catalog options to loaded ids only', () => {
        const filtered = filterCatalogItemsLoadedInProject(
            [
                catalogRow({ catalogItemId: 'cat-1' }),
                catalogRow({ catalogItemId: 'cat-2' }),
            ],
            new Set(['cat-2'])
        )

        expect(filtered.map((row) => row.catalogItemId)).toEqual(['cat-2'])
    })
})
