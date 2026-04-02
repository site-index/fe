import { useQuery } from '@tanstack/react-query'
import { Library } from 'lucide-react'
import { Link } from 'react-router-dom'

import PageDataWrapper from '@/components/PageDataWrapper'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { qk } from '@/lib/query-keys'

export interface StudioCatalogItemDefaultRow {
    catalogItemId: string
    code: string
    name: string
    workCategoryId: string
    workCategoryName: string
    sortOrder: number
    measureUnitMode: 'INHERIT' | 'OVERRIDE'
    measureUnit: { id: string; code: string; name: string } | null
    linkedItems: string[]
    lines: Array<{
        id: string
        material: string
        unit: string
        quantityPerUnit: number
        purchaseUnit: string
        yieldPerPurchase: number
        wastePercent: number
    }>
    studioDefaultUpdatedAt: string | null
}

export default function StudioCatalogItems() {
    const { accessToken, studioSlug, isQueryReady } = useAuth()

    const {
        data: rows = [],
        isPending,
        error,
    } = useQuery<StudioCatalogItemDefaultRow[], Error>({
        queryKey: qk.studioCatalogItems,
        queryFn: () =>
            apiFetch<StudioCatalogItemDefaultRow[]>(
                '/v1/studio-catalog-items',
                {
                    token: accessToken,
                    studioSlug,
                }
            ),
        enabled: isQueryReady,
    })

    const byRubro = rows.reduce<Record<string, StudioCatalogItemDefaultRow[]>>(
        (acc, row) => {
            const k = row.workCategoryName
            if (!acc[k]) acc[k] = []
            acc[k].push(row)
            return acc
        },
        {}
    )
    const rubroKeys = Object.keys(byRubro).sort()

    return (
        <PageDataWrapper
            title="Biblioteca del estudio"
            projectsLoading={false}
            emptyProject={false}
            isPending={isPending}
            error={error}
        >
            <div className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                            <Library className="h-7 w-7 text-muted-foreground" />
                            Biblioteca del estudio
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                            Rendimientos por defecto del estudio para cada ítem
                            del catálogo. Al crear una obra se copia esta
                            definición a la obra; cambios acá no modifican obras
                            ya creadas. Para editar un default usá la API{' '}
                            <code className="text-xs bg-muted px-1 rounded">
                                PATCH /v1/studio-catalog-items/:catalogItemId
                            </code>{' '}
                            (Swagger en el backend).
                        </p>
                    </div>
                    <Link
                        to="/item-yields"
                        className="text-sm text-primary hover:underline shrink-0"
                    >
                        Ver rendimientos de la obra →
                    </Link>
                </div>

                <div className="space-y-8">
                    {rubroKeys.map((rubro) => (
                        <section key={rubro}>
                            <h2 className="text-sm font-semibold text-muted-foreground mb-3 border-b border-border pb-1">
                                {rubro}
                            </h2>
                            <ul className="space-y-2">
                                {byRubro[rubro].map((r) => (
                                    <li
                                        key={r.catalogItemId}
                                        className="rounded-lg border border-border bg-card px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {r.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {r.measureUnit?.name ??
                                                    r.measureUnit?.code ??
                                                    '—'}{' '}
                                                · {r.lines.length}{' '}
                                                {r.lines.length === 1
                                                    ? 'línea'
                                                    : 'líneas'}
                                            </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {r.studioDefaultUpdatedAt
                                                ? `Actualizado ${new Date(r.studioDefaultUpdatedAt).toLocaleString('es-AR')}`
                                                : 'Sin definir aún (vacío en nuevas obras)'}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </div>
        </PageDataWrapper>
    )
}
