import { useQuery } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import { useMemo } from 'react'

import { apiFetch } from '@/lib/api'

type MeasureUnitApiShape = {
    id: string
    code: string
    name: string
}

type ItemYieldApiRow = {
    id: string
    workCategoryId: string
    workCategoryName: string
    name: string
    description: string
    measureUnit: MeasureUnitApiShape | null
}

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
      }
    | {
          kind: 'catalog'
          catalogItemId: string
          name: string
          description: string
          workCategoryName: string
          workCategoryId: string
          measureUnitId: string | null
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
        queryKey: ['item-yields', projectId],
        queryFn: () =>
            apiFetch<ItemYieldApiRow[]>(
                `/v1/projects/${projectId}/item-yields`,
                { token: accessToken, studioSlug }
            ),
        enabled: queryEnabled,
    })

    const { data: catalogDefaults = [], isPending: catalogLoading } = useQuery({
        queryKey: ['studio-catalog-items', accessToken, studioSlug],
        queryFn: () =>
            apiFetch<StudioCatalogItemApiRow[]>('/v1/studio-catalog-items', {
                token: accessToken,
                studioSlug,
            }),
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
