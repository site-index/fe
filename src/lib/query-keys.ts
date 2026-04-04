export const qk = {
    projects: ['projects'] as const,
    workCategories: ['work-categories'] as const,
    measureUnits: ['measure-units'] as const,
    resources: ['resources'] as const,
    resourcePrices: ['resource-prices'] as const,
    studioCatalogItems: ['studio-catalog-items'] as const,
    itemYields: (projectId: string) =>
        ['project', projectId, 'item-yields'] as const,
    budgetLines: (projectId: string) =>
        ['project', projectId, 'budget-lines'] as const,
    resourceDemand: (projectId: string) =>
        ['project', projectId, 'resource-demand'] as const,
    dashboard: (projectId: string) =>
        ['project', projectId, 'dashboard'] as const,
    assumptions: (projectId: string) =>
        ['project', projectId, 'assumptions'] as const,
    projectDetail: (projectId: string) =>
        ['project', projectId, 'project-detail'] as const,
    certifications: (projectId: string) =>
        ['project', projectId, 'certifications'] as const,
    certificationsSummary: (projectId: string) =>
        ['project', projectId, 'certifications-summary'] as const,
}
