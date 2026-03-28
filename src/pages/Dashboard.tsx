import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, DollarSign, Package, TrendingUp } from 'lucide-react'

import BudgetChart from '@/components/BudgetChart'
import CashHealthIndicator from '@/components/CashHealthIndicator'
import MetricCard from '@/components/MetricCard'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import type { DashboardData } from '@/types/dashboard'

export default function Dashboard() {
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug } = useAuth()

    const emptyProject = activeProject.id === '__empty__'

    const { data, isPending, error } = useQuery({
        queryKey: ['dashboard', activeProject.id, accessToken, studioSlug],
        queryFn: () =>
            apiFetch<DashboardData>(
                `/v1/projects/${activeProject.id}/dashboard`,
                {
                    token: accessToken,
                    studioSlug,
                }
            ),
        enabled:
            Boolean(accessToken && studioSlug.trim()) &&
            !emptyProject &&
            !projectsLoading,
    })

    if (projectsLoading) {
        return (
            <div className="text-sm text-muted-foreground">
                Cargando proyectos…
            </div>
        )
    }

    if (emptyProject) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-black tracking-tight">
                    Dashboard
                </h1>
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                    No hay proyectos en este estudio. Creá uno desde la API o
                    desde el flujo de registro, o verificá el slug del estudio
                    en Configuración.
                </div>
            </div>
        )
    }

    if (isPending) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-black tracking-tight">
                    Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                    Cargando métricas…
                </p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-black tracking-tight">
                    Dashboard
                </h1>
                <p className="text-sm text-destructive">
                    {getApiErrorMessage(error)}
                </p>
            </div>
        )
    }

    if (!data) {
        return null
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black tracking-tight">
                    Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                    {activeProject.name} — Resumen general
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <CashHealthIndicator
                    status={data.cashStatus}
                    label={data.cashLabel}
                    detail={data.cashDetail}
                />
                <MetricCard
                    label="Presupuesto total"
                    value={data.presupuestoTotal}
                    subtitle={data.presupuestoSubtitle}
                    icon={DollarSign}
                    flaky
                />
                <MetricCard
                    label="Gastado a la fecha"
                    value={data.gastado}
                    subtitle={data.gastadoPct}
                    icon={TrendingUp}
                    trend="neutral"
                />
                <MetricCard
                    label="Supuestos pendientes"
                    value={String(data.supuestosPendientes)}
                    subtitle={`${data.supuestosAlto} de alto impacto`}
                    icon={AlertTriangle}
                    trend="negative"
                />
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-bold mb-4">
                    Presupuesto vs. Real — Top rubros
                </h2>
                <BudgetChart data={data.chartItems} />
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-bold mb-3">
                    Últimos supuestos del sistema
                </h2>
                <ul className="space-y-2">
                    {data.recentAssumptions.length === 0 ? (
                        <li className="text-sm text-muted-foreground">
                            No hay supuestos abiertos recientes.
                        </li>
                    ) : (
                        data.recentAssumptions.map((a, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-3 rounded-md border border-border px-4 py-3 text-sm"
                            >
                                <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="flex-1">{a.text}</span>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    )
}
