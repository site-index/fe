import type Fuse from 'fuse.js'

import type { SuggestionRow } from '@/components/use-budget-line-description-suggestions'

/** Fuse-ranked suggestions for the budget-line description field (single source of truth). */
export function filterBudgetLineSuggestionRows(
    fuse: Fuse<SuggestionRow> | null,
    suggestionRows: SuggestionRow[],
    description: string
): SuggestionRow[] {
    if (fuse == null || suggestionRows.length === 0) {
        return []
    }
    const query = description.trim()
    if (query === '') {
        return suggestionRows
    }
    return fuse.search(query).map((result) => result.item)
}
