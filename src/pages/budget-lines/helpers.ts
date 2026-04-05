import type { BudgetLineRow } from '@/types/budget-line'
import type { WorkCategoryRow } from '@/types/work-category'

export type BudgetSection = {
    key: string
    workCategoryId: string | null
    categoryNumber: number | null
    name: string
    lines: BudgetLineRow[]
}

function groupByCategoryId(
    rows: BudgetLineRow[]
): Map<string, BudgetLineRow[]> {
    const map = new Map<string, BudgetLineRow[]>()
    for (const r of rows) {
        const key = r.workCategoryId ?? '__uncategorized__'
        const list = map.get(key)
        if (list) list.push(r)
        else map.set(key, [r])
    }
    return map
}

export function buildSections(
    rows: BudgetLineRow[],
    categories: WorkCategoryRow[]
): BudgetSection[] {
    const grouped = groupByCategoryId(rows)
    const sections: BudgetSection[] = categories
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => ({
            key: category.id,
            workCategoryId: category.id,
            categoryNumber: category.sortOrder > 0 ? category.sortOrder : null,
            name: category.name,
            lines: grouped.get(category.id) ?? [],
        }))
    const uncategorizedLines = grouped.get('__uncategorized__') ?? []
    if (uncategorizedLines.length > 0) {
        sections.push({
            key: '__uncategorized__',
            workCategoryId: null,
            categoryNumber: null,
            name: 'Sin rubro',
            lines: uncategorizedLines,
        })
    }
    return sections
}

export function subtotalFromLines(lines: BudgetLineRow[]): number {
    return lines.reduce((acc, line) => acc + line.total, 0)
}
