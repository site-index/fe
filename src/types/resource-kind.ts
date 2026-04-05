export const RESOURCE_KIND_MATERIAL = 'MATERIAL' as const
export const RESOURCE_KIND_LABOR = 'LABOR' as const
export const RESOURCE_KIND_EQUIPMENT = 'EQUIPMENT' as const

export const RESOURCE_KINDS = [
    RESOURCE_KIND_MATERIAL,
    RESOURCE_KIND_LABOR,
    RESOURCE_KIND_EQUIPMENT,
] as const

export type ResourceKind = (typeof RESOURCE_KINDS)[number]
