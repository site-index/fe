import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'

import CreateBudgetLineDialog from '@/components/CreateBudgetLineDialog'
import EditBudgetLinePricingSheet from '@/components/EditBudgetLinePricingSheet'
import PageDataWrapper from '@/components/PageDataWrapper'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { apiFetch } from '@/lib/api'
import type { BudgetLineRow } from '@/types/budget-line'

export type { BudgetLineRow } from '@/types/budget-line'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function groupByCategory(rows: BudgetLineRow[]): Map<string, BudgetLineRow[]> {
    const map = new Map<string, BudgetLineRow[]>()
    for (const r of rows) {
        const key = r.workCategoryName
        const list = map.get(key)
        if (list) list.push(r)
        else map.set(key, [r])
    }
    return map
}

/* ------------------------------------------------------------------ */
/*  Compact row                                                        */
/* ------------------------------------------------------------------ */

function BudgetLineRow({
    line,
    onOpen,
}: {
    line: BudgetLineRow
    onOpen: (l: BudgetLineRow) => void
}) {
    return (
        <button
            type="button"
            onClick={() => onOpen(line)}
            className="flex w-full items-center gap-3 py-2 px-3 text-left text-sm hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
        >
            <span
                className={`flex-1 truncate ${line.flaky ? 'data-flaky' : ''}`}
            >
                {line.description}
            </span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {line.quantity.toLocaleString('es-AR')}{' '}
                {line.measureUnit?.name ?? '—'}
            </span>
            <span className="shrink-0 font-mono text-xs w-20 text-right">
                ${line.unitPrice.toLocaleString('es-AR')}
            </span>
            <span
                className={`shrink-0 font-mono text-xs font-semibold w-24 text-right ${line.flaky ? 'data-flaky' : ''}`}
            >
                ${line.total.toLocaleString('es-AR')}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
    )
}

/* ------------------------------------------------------------------ */
/*  View-model hook                                                    */
/* ------------------------------------------------------------------ */

function useBudgetLinesVm() {
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug } = useAuth()
    const empty = activeProject.id === '__empty__'
    const queryEnabled =
        Boolean(accessToken && studioSlug.trim()) && !empty && !projectsLoading

    const { data, isPending, error } = useQuery({
        queryKey: ['budget-lines', activeProject.id],
        queryFn: () =>
            apiFetch<BudgetLineRow[]>(
                `/v1/projects/${activeProject.id}/budget-lines`,
                { token: accessToken, studioSlug }
            ),
        enabled: queryEnabled,
    })

    return {
        projectsLoading,
        empty,
        isPending,
        error: error as Error | null,
        rows: data ?? [],
    }
}

/* ------------------------------------------------------------------ */
/*  Body                                                               */
/* ------------------------------------------------------------------ */

function BudgetLinesBody({
    projectsLoading,
    empty,
    isPending,
    error,
    rows,
}: ReturnType<typeof useBudgetLinesVm>) {
    const [pricingLine, setPricingLine] = useState<BudgetLineRow | null>(null)
    const grouped = groupByCategory(rows)
    const categoryKeys = [...grouped.keys()].sort((a, b) =>
        a.localeCompare(b, 'es-AR')
    )

    return (
        <PageDataWrapper
            title="Presupuesto"
            projectsLoading={projectsLoading}
            emptyProject={empty}
            emptyMessage="Elegí o creá un proyecto para ver el presupuesto."
            isPending={isPending}
            error={error}
        >
            <EditBudgetLinePricingSheet
                line={pricingLine}
                open={pricingLine != null}
                onOpenChange={(o) => {
                    if (!o) setPricingLine(null)
                }}
                onLineUpdated={(l) => setPricingLine(l)}
            />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-black tracking-tight">
                        Presupuesto
                    </h1>
                    <CreateBudgetLineDialog
                        trigger={
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Nueva línea
                            </button>
                        }
                    />
                </div>

                <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                    {rows.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Todavía no hay líneas. Creá una con el botón de
                            arriba o vía API.
                        </p>
                    ) : (
                        categoryKeys.map((cat) => (
                            <div key={cat}>
                                <div className="px-3 py-1.5 bg-muted/50 border-b border-border/50">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        {cat}
                                    </span>
                                </div>
                                {grouped.get(cat)!.map((line) => (
                                    <BudgetLineRow
                                        key={line.id}
                                        line={line}
                                        onOpen={setPricingLine}
                                    />
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </PageDataWrapper>
    )
}

export default function BudgetLines() {
    const vm = useBudgetLinesVm()
    return <BudgetLinesBody {...vm} />
}
