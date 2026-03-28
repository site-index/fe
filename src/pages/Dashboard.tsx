import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, DollarSign, Package, TrendingUp } from 'lucide-react'

import BudgetChart from '@/components/BudgetChart'
import CashHealthIndicator from '@/components/CashHealthIndicator'
import MetricCard from '@/components/MetricCard'
import PageDataWrapper from '@/components/PageDataWrapper'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { apiFetch } from '@/lib/api'
import type { DashboardData } from '@/types/dashboard'

export default function Dashboard() {
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug } = useAuth()

    const emptyProject = activeProject.id === '__empty__'

    const { data, isPending, error } = useQuery({
        queryKey: ['dashboard', activeProject.id],
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

    if (!data) {
        return (
            <PageDataWrapper
                title="Dashboard"
                projectsLoading={projectsLoading}
                emptyProject={emptyProject}
                emptyMessage="No projects in this studio."
                isPending={isPending}
                error={error}
            >
                {null}
            </PageDataWrapper>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                    Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                    {activeProject.name} — overview
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <CashHealthIndicator
                    status={data.cashStatus}
                    label={data.cashLabel}
                    detail={data.cashDetail}
                />
                <MetricCard
                    label="Presupuesto total"
                    value={data.budgetTotal}
                    subtitle={data.budgetSubtitle}
                    icon={DollarSign}
                    flaky
                />
                <MetricCard
                    label="Spend to date"
                    value={data.spent}
                    subtitle={data.spentPercent}
                    icon={TrendingUp}
                    trend="neutral"
                />
                <MetricCard
                    label="Open assumptions"
                    value={String(data.openAssumptionsCount)}
                    subtitle={`${data.highImpactAssumptionsCount} high impact`}
                    icon={AlertTriangle}
                    trend="negative"
                />
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-bold mb-4">
                    Presupuesto vs real — principales líneas
                </h2>
                <BudgetChart data={data.chartRows} />
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-bold mb-3">
                    Latest system assumptions
                </h2>
                <ul className="space-y-2">
                    {data.recentAssumptions.length === 0 ? (
                        <li className="text-sm text-muted-foreground">
                            No recent open assumptions.
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
