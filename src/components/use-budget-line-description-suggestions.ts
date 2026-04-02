import { useQuery } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import { useMemo } from 'react'

import { getStudioCatalogItems } from '@/api/catalog.api'
import { getProjectItemYields } from '@/api/item-yields.api'
import { qk } from '@/lib/query-keys'
import type { ItemYield } from '@/types/item-yield'

type MeasureUnitApiShape = {
    id: string
    code: string
    name: string
}

type ItemYieldApiRow = Pick<
    ItemYield,
    'id' | 'workCategoryId' | 'workCategoryName' | 'name' | 'description'
> & { measureUnit: MeasureUnitApiShape | null }

type StudioCatalogItemApiRow = {
    catalogItemId: string
    name: string
    workCategoryId: string
    workCategoryName: string
    measureUnit: MeasureUnitApiShape | null
}

export type SuggestionRow =
    | {
          kind: 'yield'
          yieldId: string
          workCategoryId: string
          name: string
          description: string
          workCategoryName: string
          measureUnitId: string | null
          measureUnitName: string | null
      }
    | {
          kind: 'catalog'
          catalogItemId: string
          name: string
          description: string
          workCategoryName: string
          workCategoryId: string
          measureUnitId: string | null
          measureUnitName: string | null
      }

export function budgetLineSuggestionRowKey(row: SuggestionRow): string {
    return row.kind === 'yield' ? `y:${row.yieldId}` : `c:${row.catalogItemId}`
}

function buildSuggestionRows(
    yields: ItemYieldApiRow[],
    catalog: StudioCatalogItemApiRow[]
): SuggestionRow[] {
    const byYield: SuggestionRow[] = yields.map((y) => ({
        kind: 'yield' as const,
        yieldId: y.id,
        workCategoryId: y.workCategoryId,
        name: y.name,
        description: y.description ?? '',
        workCategoryName: y.workCategoryName,
        measureUnitId: y.measureUnit?.id ?? null,
        measureUnitName: y.measureUnit?.name ?? null,
    }))
    const yieldNames = new Set(
        yields.map((y) => y.name.trim().toLowerCase()).filter(Boolean)
    )
    const byCatalog: SuggestionRow[] = catalog
        .filter((c) => !yieldNames.has(c.name.trim().toLowerCase()))
        .map((c) => ({
            kind: 'catalog' as const,
            catalogItemId: c.catalogItemId,
            name: c.name,
            description: '',
            workCategoryName: c.workCategoryName,
            workCategoryId: c.workCategoryId,
            measureUnitId: c.measureUnit?.id ?? null,
            measureUnitName: c.measureUnit?.name ?? null,
        }))
    return [...byYield, ...byCatalog]
}

export function useBudgetLineDescriptionSuggestions(
    dialogOpen: boolean,
    projectId: string,
    accessToken: string | null,
    studioSlug: string
) {
    const queryEnabled = dialogOpen && projectId !== '__empty__'

    const { data: itemYields = [], isPending: yieldsLoading } = useQuery({
        queryKey: qk.itemYields(projectId),
        queryFn: async () => {
            const rows = await getProjectItemYields(projectId, {
                token: accessToken,
                studioSlug,
            })
            return rows as ItemYieldApiRow[]
        },
        enabled: queryEnabled,
    })

    const { data: catalogDefaults = [], isPending: catalogLoading } = useQuery({
        queryKey: qk.studioCatalogItems,
        queryFn: async () => {
            const rows = await getStudioCatalogItems({
                token: accessToken,
                studioSlug,
            })
            return rows as StudioCatalogItemApiRow[]
        },
        enabled: queryEnabled,
    })

    const suggestionRows = useMemo(
        () => buildSuggestionRows(itemYields, catalogDefaults),
        [itemYields, catalogDefaults]
    )

    const fuse = useMemo(() => {
        if (suggestionRows.length === 0) {
            return null
        }
        return new Fuse(suggestionRows, {
            keys: [
                { name: 'name', weight: 0.55 },
                { name: 'description', weight: 0.3 },
                { name: 'workCategoryName', weight: 0.15 },
            ],
            threshold: 0.38,
            ignoreLocation: true,
            minMatchCharLength: 1,
            includeScore: true,
        })
    }, [suggestionRows])

    const suggestionsLoading = yieldsLoading || catalogLoading

    return {
        fuse,
        suggestionRows,
        suggestionsLoading,
        queryEnabled,
        hasCorpus: suggestionRows.length > 0,
    }
}
