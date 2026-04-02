import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'

import { getProjectBudgetLines } from '@/api/budget-lines.api'
import { getWorkCategories } from '@/api/catalog.api'
import CreateBudgetLineDialog from '@/components/CreateBudgetLineDialog'
import EditBudgetLinePricingSheet from '@/components/EditBudgetLinePricingSheet'
import PageDataWrapper from '@/components/PageDataWrapper'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { qk } from '@/lib/query-keys'
import type { BudgetLineRow } from '@/types/budget-line'
import type { WorkCategoryRow } from '@/types/work-category'

export type { BudgetLineRow } from '@/types/budget-line'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type BudgetSection = {
    key: string
    workCategoryId: string | null
    rubroNumber: number | null
    name: string
    lines: BudgetLineRow[]
}

function groupByCategoryId(
    rows: BudgetLineRow[]
): Map<string, BudgetLineRow[]> {
    const map = new Map<string, BudgetLineRow[]>()
    for (const r of rows) {
        const key = r.workCategoryId ?? '__uncategorized__'
        const list = map.get(key)
        if (list) list.push(r)
        else map.set(key, [r])
    }
    return map
}

function buildSections(
    rows: BudgetLineRow[],
    categories: WorkCategoryRow[]
): BudgetSection[] {
    const grouped = groupByCategoryId(rows)
    const sections: BudgetSection[] = categories
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => ({
            key: category.id,
            workCategoryId: category.id,
            rubroNumber: category.sortOrder > 0 ? category.sortOrder : null,
            name: category.name,
            lines: grouped.get(category.id) ?? [],
        }))
    const uncategorizedLines = grouped.get('__uncategorized__') ?? []
    if (uncategorizedLines.length > 0) {
        sections.push({
            key: '__uncategorized__',
            workCategoryId: null,
            rubroNumber: null,
            name: 'Sin rubro',
            lines: uncategorizedLines,
        })
    }
    return sections
}

/* ------------------------------------------------------------------ */
/*  Compact row                                                        */
/* ------------------------------------------------------------------ */

function BudgetLineRow({
    line,
    rubroNumber,
    showBreakdown,
    onOpen,
}: {
    line: BudgetLineRow
    rubroNumber: number | null
    showBreakdown: boolean
    onOpen: (l: BudgetLineRow) => void
}) {
    const code =
        rubroNumber != null
            ? `${rubroNumber}.${line.itemNumber}`
            : `—.${line.itemNumber}`

    return (
        <button
            type="button"
            onClick={() => onOpen(line)}
            className="grid w-full grid-cols-[90px_minmax(260px,1.6fr)_90px_110px_repeat(3,110px)_130px_130px_36px] items-center gap-2 border-b border-border/50 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40 print:grid-cols-[70px_minmax(220px,1.6fr)_60px_80px_repeat(3,80px)_90px_90px_24px] print:gap-1 print:px-2 print:py-1.5"
        >
            <span className="font-mono text-xs text-muted-foreground">
                {code}
            </span>
            <span className={`truncate ${line.flaky ? 'data-flaky' : ''}`}>
                {line.description}
                {line.usesUnitPriceOverride ? (
                    <span className="ml-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700 print:hidden">
                        Costo manual
                    </span>
                ) : null}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
                {line.measureUnit?.name ?? '—'}
            </span>
            <span className="font-mono text-xs text-right">
                {line.quantity.toLocaleString('es-AR')}
            </span>
            {showBreakdown ? (
                <>
                    <span className="font-mono text-xs text-right">
                        ${line.amountMaterial.toLocaleString('es-AR')}
                    </span>
                    <span className="font-mono text-xs text-right">
                        ${line.amountLabor.toLocaleString('es-AR')}
                    </span>
                    <span className="font-mono text-xs text-right">
                        ${line.amountEquipment.toLocaleString('es-AR')}
                    </span>
                </>
            ) : (
                <>
                    <span className="font-mono text-xs text-right">—</span>
                    <span className="font-mono text-xs text-right">—</span>
                    <span className="font-mono text-xs text-right">—</span>
                </>
            )}
            <span
                className={`font-mono text-xs text-right ${line.flaky ? 'data-flaky' : ''}`}
            >
                ${line.unitPrice.toLocaleString('es-AR')}
            </span>
            <span className="font-mono text-xs font-semibold text-right">
                ${line.total.toLocaleString('es-AR')}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground print:hidden" />
        </button>
    )
}

/* ------------------------------------------------------------------ */
/*  View-model hook                                                    */
/* ------------------------------------------------------------------ */

function useBudgetLinesVm() {
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const empty = activeProject.id === '__empty__'
    const queryEnabled = isQueryReady && !empty && !projectsLoading

    const { data, isPending, error } = useQuery({
        queryKey: qk.budgetLines(activeProject.id),
        queryFn: () =>
            getProjectBudgetLines(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })

    const { data: categories = [], isPending: categoriesPending } = useQuery({
        queryKey: qk.workCategories,
        queryFn: () =>
            getWorkCategories({
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })

    return {
        projectsLoading,
        empty,
        isPending: isPending || categoriesPending,
        error: error as Error | null,
        rows: data ?? [],
        categories,
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
    categories,
}: ReturnType<typeof useBudgetLinesVm>) {
    const [pricingLine, setPricingLine] = useState<BudgetLineRow | null>(null)
    const [showBreakdown, setShowBreakdown] = useState(false)
    const sections = buildSections(rows, categories)

    return (
        <PageDataWrapper
            title="Cómputo & Presupuesto"
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

            <div className="space-y-4 print:space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 print:mb-2">
                    <h1 className="text-xl font-black tracking-tight">
                        Cómputo & Presupuesto
                    </h1>
                    <div className="flex items-center gap-2 print:hidden">
                        <Button
                            type="button"
                            size="sm"
                            variant={showBreakdown ? 'outline' : 'default'}
                            onClick={() => setShowBreakdown(false)}
                        >
                            Ver total
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={showBreakdown ? 'default' : 'outline'}
                            onClick={() => setShowBreakdown(true)}
                        >
                            Ver MAT-MO-EQ
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => window.print()}
                        >
                            Imprimir
                        </Button>
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                    <div className="grid grid-cols-[90px_minmax(260px,1.6fr)_90px_110px_repeat(3,110px)_130px_130px_36px] items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground print:grid-cols-[70px_minmax(220px,1.6fr)_60px_80px_repeat(3,80px)_90px_90px_24px] print:gap-1 print:px-2 print:py-1">
                        <span>N°</span>
                        <span>Ítem</span>
                        <span>Unidad</span>
                        <span className="text-right">Cantidad</span>
                        <span className="text-right">MAT</span>
                        <span className="text-right">MO</span>
                        <span className="text-right">EQ</span>
                        <span className="text-right">P. Unit.</span>
                        <span className="text-right">Total</span>
                        <span className="print:hidden" />
                    </div>
                    {sections.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Todavía no hay líneas. Creá un ítem desde un rubro o
                            vía API.
                        </p>
                    ) : (
                        sections.map((section) => (
                            <div key={section.key}>
                                <div className="flex items-center justify-between border-b border-border/50 bg-muted/50 px-3 py-1.5 print:px-2 print:py-1">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {section.rubroNumber != null
                                            ? `Rubro ${section.rubroNumber}`
                                            : 'Rubro'}{' '}
                                        · {section.name}
                                    </span>
                                    <CreateBudgetLineDialog
                                        defaultWorkCategoryId={
                                            section.workCategoryId
                                        }
                                        trigger={
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 gap-1.5 px-2 text-xs print:hidden"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Nuevo ítem
                                            </Button>
                                        }
                                    />
                                </div>
                                {section.lines.length === 0 ? (
                                    <p className="border-b border-border/50 px-3 py-2 text-xs text-muted-foreground print:px-2 print:py-1.5">
                                        Sin ítems todavía en este rubro.
                                    </p>
                                ) : (
                                    section.lines.map((line) => (
                                        <BudgetLineRow
                                            key={line.id}
                                            line={line}
                                            rubroNumber={section.rubroNumber}
                                            showBreakdown={showBreakdown}
                                            onOpen={setPricingLine}
                                        />
                                    ))
                                )}
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
