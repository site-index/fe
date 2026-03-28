export type WorkCategoryRow = {
    id: string
    code: string
    sortOrder: number
    name: string
}

/** Seeded id for “Otros” — must match `be` migration `WorkCategory` seed. */
export const OTHER_WORK_CATEGORY_ID =
    'a0000009-0000-4000-8000-000000000009' as const
