export type WorkCategoryRow = {
    id: string
    code: string
    sortOrder: number
    name: string
}

/** English catalog code for “Otros” — matches migration + seed (`other`). */
export const OTHER_WORK_CATEGORY_CODE = 'other' as const
