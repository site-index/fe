type StudioScope = string | null | undefined

const EMPTY_STRING_LENGTH = 0

function studioScopeKey(studioSlug: StudioScope): string {
    const normalized = studioSlug?.trim().toLowerCase()
    return normalized && normalized.length > EMPTY_STRING_LENGTH
        ? normalized
        : '__studio_unknown__'
}

export const qk = {
    projects: (studioSlug: StudioScope) =>
        ['studio', studioScopeKey(studioSlug), 'projects'] as const,
    workCategories: (studioSlug: StudioScope) =>
        ['studio', studioScopeKey(studioSlug), 'work-categories'] as const,
    measureUnits: (studioSlug: StudioScope) =>
        ['studio', studioScopeKey(studioSlug), 'measure-units'] as const,
    resources: (studioSlug: StudioScope) =>
        ['studio', studioScopeKey(studioSlug), 'resources'] as const,
    resourcePrices: (studioSlug: StudioScope) =>
        ['studio', studioScopeKey(studioSlug), 'resource-prices'] as const,
    studioCatalogItems: (studioSlug: StudioScope) =>
        ['studio', studioScopeKey(studioSlug), 'studio-catalog-items'] as const,
    itemYields: (studioSlug: StudioScope, projectId: string) =>
        [
            'studio',
            studioScopeKey(studioSlug),
            'project',
            projectId,
            'item-yields',
        ] as const,
    budgetLines: (studioSlug: StudioScope, projectId: string) =>
        [
            'studio',
            studioScopeKey(studioSlug),
            'project',
            projectId,
            'budget-lines',
        ] as const,
    resourceDemand: (studioSlug: StudioScope, projectId: string) =>
        [
            'studio',
            studioScopeKey(studioSlug),
            'project',
            projectId,
            'resource-demand',
        ] as const,
    dashboard: (studioSlug: StudioScope, projectId: string) =>
        [
            'studio',
            studioScopeKey(studioSlug),
            'project',
            projectId,
            'dashboard',
        ] as const,
    assumptions: (studioSlug: StudioScope, projectId: string) =>
        [
            'studio',
            studioScopeKey(studioSlug),
            'project',
            projectId,
            'assumptions',
        ] as const,
    projectDetail: (studioSlug: StudioScope, projectId: string) =>
        [
            'studio',
            studioScopeKey(studioSlug),
            'project',
            projectId,
            'project-detail',
        ] as const,
    certifications: (studioSlug: StudioScope, projectId: string) =>
        [
            'studio',
            studioScopeKey(studioSlug),
            'project',
            projectId,
            'certifications',
        ] as const,
    certificationsSummary: (studioSlug: StudioScope, projectId: string) =>
        [
            'studio',
            studioScopeKey(studioSlug),
            'project',
            projectId,
            'certifications-summary',
        ] as const,
}
