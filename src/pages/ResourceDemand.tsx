import { useQuery } from '@tanstack/react-query'
import { Boxes } from 'lucide-react'

import { getProjectResourceDemand } from '@/api/resources.api'
import PageDataWrapper from '@/components/PageDataWrapper'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { qk } from '@/lib/query-keys'

export default function ResourceDemand() {
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const empty = activeProject.id === '__empty__'

    const {
        data = [],
        isPending,
        error,
    } = useQuery({
        queryKey: qk.resourceDemand(activeProject.id),
        queryFn: () =>
            getProjectResourceDemand(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: isQueryReady && !empty && !projectsLoading,
    })

    return (
        <PageDataWrapper
            title="Demanda de recursos"
            projectsLoading={projectsLoading}
            emptyProject={empty}
            emptyMessage="Elegí un proyecto para ver la demanda de recursos."
            isPending={isPending}
            error={error}
        >
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-muted-foreground" />
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                        Demanda de recursos
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground">
                    Totales agregados del proyecto por recurso (materiales, mano
                    de obra y equipos), calculados desde rendimientos y precios
                    vigentes del estudio.
                </p>

                <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                                        Recurso
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                                        Tipo
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                        Cantidad requerida
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                        Costo unitario estimado
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                        Costo total estimado
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row) => (
                                    <tr
                                        key={row.resourceId}
                                        className="border-b border-border last:border-0"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium">
                                                {row.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {row.code}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono">
                                            {row.kind}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {row.requiredQuantity.toLocaleString(
                                                'es-AR',
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                }
                                            )}{' '}
                                            {row.measureUnit.name}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            $
                                            {row.estimatedUnitCost.toLocaleString(
                                                'es-AR',
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                }
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold">
                                            $
                                            {row.estimatedTotalCost.toLocaleString(
                                                'es-AR',
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                }
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {data.length === 0 ? (
                                    <tr>
                                        <td
                                            className="px-4 py-8 text-center text-muted-foreground"
                                            colSpan={5}
                                        >
                                            No hay demanda calculable todavía.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </PageDataWrapper>
    )
}
