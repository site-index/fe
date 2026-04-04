export type WorkCategoryRow = {
    id: string
    code: string
    sortOrder: number
    name: string
}

/** Catalog code for “Otros” — matches migration + seed (`otros`). */
export const OTHER_WORK_CATEGORY_CODE = 'otros' as const
