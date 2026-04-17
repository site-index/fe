import type Fuse from 'fuse.js'

import type { SuggestionRow } from '@/components/use-budget-line-description-suggestions'

const EMPTY_ROW_COUNT = 0

/** Fuse-ranked suggestions for the budget-line description field (single source of truth). */
export function filterBudgetLineSuggestionRows(
    fuse: Fuse<SuggestionRow> | null,
    suggestionRows: SuggestionRow[],
    description: string,
    workCategoryId: string | null
): SuggestionRow[] {
    if (suggestionRows.length === EMPTY_ROW_COUNT) {
        return []
    }
    const scopedRows =
        workCategoryId == null
            ? suggestionRows
            : suggestionRows.filter(
                  (row) => row.workCategoryId === workCategoryId
              )
    if (scopedRows.length === EMPTY_ROW_COUNT) {
        // Guardrail: if category scoping yields nothing, keep suggestions usable
        // instead of rendering an empty panel.
        return suggestionRows
    }
    const query = description.trim()
    if (query === '') {
        return scopedRows
    }
    if (fuse == null) {
        const queryLower = query.toLowerCase()
        const directMatches = scopedRows.filter((row) => {
            const name = row.name.toLowerCase()
            const category = row.workCategoryName.toLowerCase()
            return name.includes(queryLower) || category.includes(queryLower)
        })
        return directMatches.length > 0 ? directMatches : scopedRows
    }
    const ranked = fuse
        .search(query)
        .map((result) => result.item)
        .filter((row) =>
            workCategoryId == null
                ? true
                : row.workCategoryId === workCategoryId
        )
    return ranked.length > 0 ? ranked : scopedRows
}
