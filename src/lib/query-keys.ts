export const qk = {
    projects: ['projects'] as const,
    workCategories: ['work-categories'] as const,
    measureUnits: ['measure-units'] as const,
    studioCatalogItems: ['studio-catalog-items'] as const,
    itemYields: (projectId: string) => ['item-yields', projectId] as const,
    budgetLines: (projectId: string) => ['budget-lines', projectId] as const,
    dashboard: (projectId: string) => ['dashboard', projectId] as const,
    assumptions: (projectId: string) => ['assumptions', projectId] as const,
    projectDetail: (projectId: string) =>
        ['project-detail', projectId] as const,
    certifications: (projectId: string) =>
        ['certifications', projectId] as const,
    certificationsSummary: (projectId: string) =>
        ['certifications-summary', projectId] as const,
}
