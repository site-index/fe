import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock } from 'lucide-react'

import PageDataWrapper from '@/components/PageDataWrapper'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { apiFetch } from '@/lib/api'

type CertRow = {
    description: string
    unit: string
    plannedQuantity: number
    certifiedQuantity: number
    certPct: number
}

type CertSummary = {
    pct: number
    lastCertLabel: string | null
}

function ProgressBar({ pct }: { pct: number }) {
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full rounded-full bg-positive transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs font-mono font-semibold w-10 text-right">
                {pct}%
            </span>
        </div>
    )
}

function formatDate(iso: string | null): string {
    if (!iso) return '—'
    try {
        const d = new Date(iso)
        return d.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    } catch {
        return iso
    }
}

/* ------------------------------------------------------------------ */
/*  View-model hook                                                    */
/* ------------------------------------------------------------------ */

function useCertificationVm() {
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const empty = activeProject.id === '__empty__'
    const queryEnabled = isQueryReady && !empty && !projectsLoading

    const qRows = useQuery({
        queryKey: ['certifications', activeProject.id],
        queryFn: () =>
            apiFetch<CertRow[]>(
                `/v1/projects/${activeProject.id}/certifications`,
                { token: accessToken, studioSlug }
            ),
        enabled: queryEnabled,
    })

    const qSummary = useQuery({
        queryKey: ['certifications-summary', activeProject.id],
        queryFn: () =>
            apiFetch<CertSummary>(
                `/v1/projects/${activeProject.id}/certifications/summary`,
                { token: accessToken, studioSlug }
            ),
        enabled: queryEnabled,
    })

    return {
        projectsLoading,
        empty,
        isPending: qRows.isPending || qSummary.isPending,
        error: (qRows.error ?? qSummary.error) as Error | null,
        rows: qRows.data ?? [],
        summary: qSummary.data,
    }
}

/* ------------------------------------------------------------------ */
/*  Body                                                               */
/* ------------------------------------------------------------------ */

function CertificationBody({
    rows,
    summary,
}: {
    rows: CertRow[]
    summary: CertSummary | undefined
}) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                    Certification
                </h1>
                <p className="text-sm text-muted-foreground">
                    Job-wide progress — accumulated certifications
                </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-positive" />
                    <p className="font-bold">
                        Overall progress:{' '}
                        <span className="font-mono">{summary?.pct ?? 0}%</span>
                    </p>
                </div>
                <ProgressBar pct={summary?.pct ?? 0} />
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Last certification:{' '}
                    {formatDate(summary?.lastCertLabel ?? null)}
                </p>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
                {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No hay líneas de presupuesto con cantidad planificada.
                    </p>
                ) : (
                    rows.map((row, i) => (
                        <div
                            key={`${row.description}-${i}`}
                            className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-2"
                        >
                            <p className="font-medium text-sm">
                                {row.description}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-muted-foreground">
                                        Plan:
                                    </span>{' '}
                                    <span className="font-mono">
                                        {row.plannedQuantity.toLocaleString(
                                            'en-US'
                                        )}{' '}
                                        {row.unit}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Cert.:
                                    </span>{' '}
                                    <span className="font-mono">
                                        {row.certifiedQuantity.toLocaleString(
                                            'en-US'
                                        )}{' '}
                                        {row.unit}
                                    </span>
                                </div>
                            </div>
                            <ProgressBar pct={row.certPct} />
                        </div>
                    ))
                )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                                    Line
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Unit
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Planned
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Certified
                                </th>
                                <th className="px-4 py-3 font-semibold text-muted-foreground w-48">
                                    Progress
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        No hay líneas de presupuesto con
                                        cantidad planificada.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, i) => (
                                    <tr
                                        key={`${row.description}-${i}`}
                                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {row.description}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs">
                                            {row.unit}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {row.plannedQuantity.toLocaleString(
                                                'en-US'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {row.certifiedQuantity.toLocaleString(
                                                'en-US'
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ProgressBar pct={row.certPct} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                    <strong>Detailed certification:</strong> period entry,
                    trade-level approval, and theoretical consumption back-calc
                    will expand in later iterations.
                </p>
            </div>
        </div>
    )
}

export default function Certification() {
    const vm = useCertificationVm()
    return (
        <PageDataWrapper
            title="Certification"
            projectsLoading={vm.projectsLoading}
            emptyProject={vm.empty}
            emptyMessage="Select a project to view certifications."
            isPending={vm.isPending}
            error={vm.error}
        >
            <CertificationBody rows={vm.rows} summary={vm.summary} />
        </PageDataWrapper>
    )
}
