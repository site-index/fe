export type WorkCategoryRow = {
    id: string
    code: string
    sortOrder: number
    name: string
}

/** Seeded id for “Otros” — must match `be/prisma/seed.ts` (`CATEGORIES` order). */
export const OTHER_WORK_CATEGORY_ID =
    'a0000027-0000-4000-8000-000000000027' as const
