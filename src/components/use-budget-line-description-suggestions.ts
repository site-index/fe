import { useQuery } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import { useMemo } from 'react'

import { apiFetch } from '@/lib/api'

type ItemYieldApiRow = {
    id: string
    workCategoryId: string
    workCategoryName: string
    name: string
    description: string
}

type ItemStudioApiRow = {
    itemId: string
    name: string
    workCategoryId: string
    workCategoryName: string
}

export type SuggestionRow =
    | {
          kind: 'yield'
          yieldId: string
          name: string
          description: string
          workCategoryName: string
      }
    | {
          kind: 'catalog'
          itemId: string
          name: string
          description: string
          workCategoryName: string
          workCategoryId: string
      }

function buildSuggestionRows(
    yields: ItemYieldApiRow[],
    catalog: ItemStudioApiRow[]
): SuggestionRow[] {
    const byYield: SuggestionRow[] = yields.map((y) => ({
        kind: 'yield' as const,
        yieldId: y.id,
        name: y.name,
        description: y.description ?? '',
        workCategoryName: y.workCategoryName,
    }))
    const yieldNames = new Set(
        yields.map((y) => y.name.trim().toLowerCase()).filter(Boolean)
    )
    const byCatalog: SuggestionRow[] = catalog
        .filter((c) => !yieldNames.has(c.name.trim().toLowerCase()))
        .map((c) => ({
            kind: 'catalog' as const,
            itemId: c.itemId,
            name: c.name,
            description: '',
            workCategoryName: c.workCategoryName,
            workCategoryId: c.workCategoryId,
        }))
    return [...byYield, ...byCatalog]
}

export function useBudgetLineDescriptionSuggestions(
    dialogOpen: boolean,
    projectId: string,
    accessToken: string | null,
    studioSlug: string
) {
    const queryEnabled =
        dialogOpen &&
        Boolean(accessToken && studioSlug.trim()) &&
        projectId !== '__empty__'

    const { data: itemYields = [], isPending: yieldsLoading } = useQuery({
        queryKey: ['item-yields', projectId, accessToken, studioSlug],
        queryFn: () =>
            apiFetch<ItemYieldApiRow[]>(
                `/v1/projects/${projectId}/item-yields`,
                { token: accessToken, studioSlug }
            ),
        enabled: queryEnabled,
    })

    const { data: catalogDefaults = [], isPending: catalogLoading } = useQuery({
        queryKey: ['item-studio-defaults', accessToken, studioSlug],
        queryFn: () =>
            apiFetch<ItemStudioApiRow[]>('/v1/item-studio-defaults', {
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
