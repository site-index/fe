import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock } from 'lucide-react'

import PageDataWrapper from '@/components/PageDataWrapper'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useScope } from '@/contexts/ScopeContext'
import { apiFetch } from '@/lib/api'
import { qk } from '@/lib/query-keys'

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
const ZERO_PERCENT = 0
const EMPTY_ROWS_LENGTH = 0

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
        return d.toLocaleDateString('es-AR', {
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
    const { isProjectScope } = useScope()
    const queryEnabled =
        isQueryReady && isProjectScope && !empty && !projectsLoading

    const qRows = useQuery({
        queryKey: qk.certifications(studioSlug, activeProject.id),
        queryFn: () =>
            apiFetch<CertRow[]>(
                `/v1/projects/${activeProject.id}/certifications`,
                { token: accessToken, studioSlug }
            ),
        enabled: queryEnabled,
    })

    const qSummary = useQuery({
        queryKey: qk.certificationsSummary(studioSlug, activeProject.id),
        queryFn: () =>
            apiFetch<CertSummary>(
                `/v1/projects/${activeProject.id}/certifications/summary`,
                { token: accessToken, studioSlug }
            ),
        enabled: queryEnabled,
    })

    return {
        projectsLoading,
        isProjectScope,
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
                    Certificación
                </h1>
                <p className="text-sm text-muted-foreground">
                    Avance general de la obra por certificaciones acumuladas
                </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-positive" />
                    <p className="font-bold">
                        Avance total:{' '}
                        <span className="font-mono">
                            {summary?.pct ?? ZERO_PERCENT}%
                        </span>
                    </p>
                </div>
                <ProgressBar pct={summary?.pct ?? ZERO_PERCENT} />
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Última certificación:{' '}
                    {formatDate(summary?.lastCertLabel ?? null)}
                </p>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
                {rows.length === EMPTY_ROWS_LENGTH ? (
                    <p className="text-sm text-muted-foreground">
                        No hay ítems de Cómputo & Presupuesto con cantidad
                        planificada.
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
                                            'es-AR'
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
                                            'es-AR'
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
                                    Línea
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Unidad
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Planificado
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Certificado
                                </th>
                                <th className="px-4 py-3 font-semibold text-muted-foreground w-48">
                                    Avance
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === EMPTY_ROWS_LENGTH ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        No hay ítems de Cómputo & Presupuesto
                                        con cantidad planificada.
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
                                                'es-AR'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {row.certifiedQuantity.toLocaleString(
                                                'es-AR'
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
                    <strong>Certificación detallada:</strong> carga por período,
                    aprobación por rubro y retrocálculo de consumos teóricos se
                    suman en próximas iteraciones.
                </p>
            </div>
        </div>
    )
}

export default function Certification() {
    const vm = useCertificationVm()
    return (
        <PageDataWrapper
            title="Certificación"
            blockedByScope={!vm.isProjectScope}
            blockedMessage="Esta vista es por proyecto. Cambiá a modo Proyecto para continuar."
            projectsLoading={vm.projectsLoading}
            emptyProject={vm.empty}
            emptyMessage="Elegí un proyecto para ver certificaciones."
            isPending={vm.isPending}
            error={vm.error}
        >
            <CertificationBody rows={vm.rows} summary={vm.summary} />
        </PageDataWrapper>
    )
}
