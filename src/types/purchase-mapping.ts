export const PURCHASE_STATUS_MAPPED = 'MAPPED' as const
export const PURCHASE_STATUS_UNMAPPED = 'UNMAPPED' as const

export const PURCHASE_MAPPING_STATUSES = [
    PURCHASE_STATUS_MAPPED,
    PURCHASE_STATUS_UNMAPPED,
] as const

export type PurchaseMappingStatus = (typeof PURCHASE_MAPPING_STATUSES)[number]

export const NO_MEASURE_UNIT_ID = '__none__' as const
