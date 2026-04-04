import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    AlertTriangle,
    ArrowUpDown,
    CheckCircle2,
    Edit3,
    Loader2,
} from 'lucide-react'
import { useState } from 'react'

import PageDataWrapper from '@/components/PageDataWrapper'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useScope } from '@/contexts/ScopeContext'
import { apiFetch } from '@/lib/api'
import { qk } from '@/lib/query-keys'

type AssumptionRow = {
    id: string
    text: string
    type: 'imputation' | 'deviation' | 'price_alert'
    amountARS: number
    impact: 'high' | 'medium' | 'low'
    date: string
}

const typeLabels = {
    imputation: 'Imputación',
    deviation: 'Desvío',
    price_alert: 'Precio',
}

const impactColors = {
    high: 'text-negative font-semibold',
    medium: 'text-yellow-600 font-medium',
    low: 'text-muted-foreground',
}

export default function Assumptions() {
    const queryClient = useQueryClient()
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const empty = activeProject.id === '__empty__'
    const { isProjectScope } = useScope()
    const [resolvingId, setResolvingId] = useState<string | null>(null)

    const { data, isPending, error } = useQuery({
        queryKey: qk.assumptions(activeProject.id),
        queryFn: () =>
            apiFetch<AssumptionRow[]>(
                `/v1/projects/${activeProject.id}/assumptions`,
                { token: accessToken, studioSlug }
            ),
        enabled: isQueryReady && isProjectScope && !empty && !projectsLoading,
    })

    const resolveMutation = useMutation({
        mutationFn: (assumptionId: string) =>
            apiFetch(
                `/v1/projects/${activeProject.id}/assumptions/${assumptionId}`,
                {
                    method: 'PATCH',
                    token: accessToken,
                    studioSlug,
                    body: { status: 'RESOLVED' },
                }
            ),
        onMutate: (assumptionId: string) => {
            setResolvingId(assumptionId)
        },
        onSettled: () => {
            setResolvingId(null)
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: qk.assumptions(activeProject.id),
            })
            void queryClient.invalidateQueries({
                queryKey: qk.dashboard(activeProject.id),
            })
        },
    })

    const rows = data ?? []

    return (
        <PageDataWrapper
            title="Supuestos"
            blockedByScope={!isProjectScope}
            blockedMessage="Esta vista es por proyecto. Cambiá a modo Proyecto para continuar."
            projectsLoading={projectsLoading}
            emptyProject={empty}
            emptyMessage="Elegí un proyecto para ver supuestos abiertos."
            isPending={isPending}
            error={error}
        >
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                            Supuestos
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Cola de decisiones del sistema para revisión
                            asíncrona
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        Orden:{' '}
                        <span className="font-semibold text-foreground">
                            Dinero · Tiempo · Impacto
                        </span>
                    </div>
                </div>

                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                    <strong>Mezcla de orden personalizada:</strong> deslizadores
                    de Dinero / Tiempo / Impacto para reequilibrar la prioridad
                    de la cola. <em>(Fase 2)</em>
                </div>

                <div className="space-y-3">
                    {rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No hay supuestos abiertos.
                        </p>
                    ) : (
                        rows.map((a) => {
                            const isResolving = resolvingId === a.id
                            return (
                                <div
                                    key={a.id}
                                    className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-negative/70" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">
                                                {typeLabels[a.type]}
                                            </span>
                                            <span
                                                className={`text-xs ${impactColors[a.impact]}`}
                                            >
                                                {a.impact.toUpperCase()}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {a.date}
                                            </span>
                                        </div>
                                        <p className="text-sm">{a.text}</p>
                                        <p className="mt-1 text-xs font-mono text-muted-foreground">
                                            Monto involucrado: $
                                            {a.amountARS.toLocaleString(
                                                'es-AR'
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1.5 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={resolvingId !== null}
                                            onClick={() =>
                                                resolveMutation.mutate(a.id)
                                            }
                                            className="bg-positive/15 text-positive hover:bg-positive/25 hover:text-positive"
                                        >
                                            {isResolving ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            )}
                                            Confirm
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled
                                            title="Edición disponible próximamente"
                                            className="opacity-60"
                                        >
                                            <Edit3 className="h-3.5 w-3.5" />
                                            Editar
                                        </Button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="flex justify-center">
                    <Button variant="outline" disabled className="opacity-60">
                        Confirmar todos los de bajo impacto (Pareto 90%)
                    </Button>
                </div>
            </div>
        </PageDataWrapper>
    )
}
