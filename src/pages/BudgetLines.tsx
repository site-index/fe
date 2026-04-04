import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronsDown, ChevronsUp, Plus } from 'lucide-react'
import { useState } from 'react'

import { getProjectBudgetLines } from '@/api/budget-lines.api'
import { getWorkCategories } from '@/api/catalog.api'
import CreateBudgetLineDialog from '@/components/CreateBudgetLineDialog'
import EditBudgetLineDialog from '@/components/EditBudgetLineDialog'
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
    categoryNumber: number | null
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
            categoryNumber: category.sortOrder > 0 ? category.sortOrder : null,
            name: category.name,
            lines: grouped.get(category.id) ?? [],
        }))
    const uncategorizedLines = grouped.get('__uncategorized__') ?? []
    if (uncategorizedLines.length > 0) {
        sections.push({
            key: '__uncategorized__',
            workCategoryId: null,
            categoryNumber: null,
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
    categoryNumber,
    onOpen,
}: {
    line: BudgetLineRow
    categoryNumber: number | null
    onOpen: (l: BudgetLineRow) => void
}) {
    const code =
        categoryNumber != null
            ? `${categoryNumber}.${line.itemNumber}`
            : `—.${line.itemNumber}`

    return (
        <button
            type="button"
            onClick={() => onOpen(line)}
            className="hidden w-full grid-cols-[90px_minmax(260px,1.6fr)_90px_110px_repeat(3,110px)_130px_130px_36px] items-center gap-2 border-b border-border/50 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40 md:grid print:grid-cols-[70px_minmax(220px,1.6fr)_60px_80px_repeat(3,80px)_90px_90px_24px] print:gap-1 print:px-2 print:py-1.5"
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
            <span className="font-mono text-xs text-right">
                ${line.amountMaterial.toLocaleString('es-AR')}
            </span>
            <span className="font-mono text-xs text-right">
                ${line.amountLabor.toLocaleString('es-AR')}
            </span>
            <span className="font-mono text-xs text-right">
                ${line.amountEquipment.toLocaleString('es-AR')}
            </span>
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

function BudgetLineMobileRow({
    line,
    showBreakdown,
    onOpen,
}: {
    line: BudgetLineRow
    showBreakdown: boolean
    onOpen: (l: BudgetLineRow) => void
}) {
    return (
        <div className="border-b border-border/50 px-3 py-2 md:hidden">
            <button
                type="button"
                onClick={() => onOpen(line)}
                className="w-full space-y-2 rounded-md p-1 text-left transition-colors hover:bg-muted/40"
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                        <p
                            className={`line-clamp-2 text-sm ${line.flaky ? 'data-flaky' : ''}`}
                        >
                            {line.description}
                            {line.usesUnitPriceOverride ? (
                                <span className="ml-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">
                                    Costo manual
                                </span>
                            ) : null}
                        </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-4 gap-x-2 gap-y-1 text-xs">
                    <p className="text-muted-foreground">Cant</p>
                    <p className="text-muted-foreground text-center">U</p>
                    <p className="text-muted-foreground text-right">PU</p>
                    <p className="text-muted-foreground text-right">Tot</p>
                    <p className="font-mono">
                        {line.quantity.toLocaleString('es-AR')}
                    </p>
                    <p className="font-mono text-center">
                        {line.measureUnit?.name ?? '—'}
                    </p>
                    <p
                        className={`font-mono text-right ${line.flaky ? 'data-flaky' : ''}`}
                    >
                        ${line.unitPrice.toLocaleString('es-AR')}
                    </p>
                    <p className="font-mono font-semibold text-right">
                        ${line.total.toLocaleString('es-AR')}
                    </p>
                </div>
            </button>

            <details className="mt-1 rounded-md border border-border/60 bg-muted/20 px-2 py-1">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                    Ver detalle de costos
                </summary>
                <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                    <div className="space-y-0.5">
                        <p className="text-muted-foreground">MAT</p>
                        <p className="font-mono">
                            {showBreakdown
                                ? `$${line.amountMaterial.toLocaleString('es-AR')}`
                                : '—'}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-muted-foreground">MO</p>
                        <p className="font-mono">
                            {showBreakdown
                                ? `$${line.amountLabor.toLocaleString('es-AR')}`
                                : '—'}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-muted-foreground">EQ</p>
                        <p className="font-mono">
                            {showBreakdown
                                ? `$${line.amountEquipment.toLocaleString(
                                      'es-AR'
                                  )}`
                                : '—'}
                        </p>
                    </div>
                </div>
            </details>
        </div>
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
    const [collapsedSections, setCollapsedSections] = useState<
        Record<string, boolean>
    >({})
    const sections = buildSections(rows, categories)
    const sectionKeys = sections.map((section) => section.key)
    const allSectionsCollapsed =
        sectionKeys.length > 0 &&
        sectionKeys.every((key) => collapsedSections[key] ?? false)

    return (
        <PageDataWrapper
            title="Cómputo & Presupuesto"
            projectsLoading={projectsLoading}
            emptyProject={empty}
            emptyMessage="Elegí o creá un proyecto para ver el presupuesto."
            isPending={isPending}
            error={error}
        >
            <EditBudgetLineDialog
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
                            variant="outline"
                            className="h-8 w-8 px-0"
                            aria-label={
                                allSectionsCollapsed
                                    ? 'Expandir rubros'
                                    : 'Contraer rubros'
                            }
                            title={
                                allSectionsCollapsed
                                    ? 'Expandir rubros'
                                    : 'Contraer rubros'
                            }
                            onClick={() => {
                                if (sectionKeys.length === 0) return
                                if (allSectionsCollapsed) {
                                    setCollapsedSections({})
                                    return
                                }
                                setCollapsedSections(
                                    Object.fromEntries(
                                        sectionKeys.map((key) => [key, true])
                                    )
                                )
                            }}
                        >
                            {allSectionsCollapsed ? (
                                <ChevronsDown className="h-4 w-4" />
                            ) : (
                                <ChevronsUp className="h-4 w-4" />
                            )}
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
                    <div className="hidden grid-cols-[90px_minmax(260px,1.6fr)_90px_110px_repeat(3,110px)_130px_130px_36px] items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid print:grid-cols-[70px_minmax(220px,1.6fr)_60px_80px_repeat(3,80px)_90px_90px_24px] print:gap-1 print:px-2 print:py-1">
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
                        sections.map((section) => {
                            const isCollapsed =
                                collapsedSections[section.key] ?? false
                            const sectionSubtotal = section.lines.reduce(
                                (acc, line) => acc + line.total,
                                0
                            )

                            return (
                                <div key={section.key}>
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/50 px-3 py-1.5 print:px-2 print:py-1">
                                        <button
                                            type="button"
                                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left md:hidden"
                                            onClick={() =>
                                                setCollapsedSections(
                                                    (prev) => ({
                                                        ...prev,
                                                        [section.key]: !(
                                                            prev[section.key] ??
                                                            false
                                                        ),
                                                    })
                                                )
                                            }
                                            aria-expanded={!isCollapsed}
                                            aria-label={`Alternar rubro ${section.name}`}
                                        >
                                            <ChevronRight
                                                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                                                    isCollapsed
                                                        ? ''
                                                        : 'rotate-90'
                                                }`}
                                            />
                                            <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                {section.name}
                                            </span>
                                        </button>
                                        <span className="hidden min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground md:inline">
                                            {section.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-semibold">
                                                $
                                                {sectionSubtotal.toLocaleString(
                                                    'es-AR'
                                                )}
                                            </span>
                                            <CreateBudgetLineDialog
                                                defaultWorkCategoryId={
                                                    section.workCategoryId
                                                }
                                                trigger={
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 px-0 text-sm print:hidden"
                                                        aria-label="Nuevo ítem"
                                                        title="Nuevo ítem"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </div>
                                    {section.lines.length === 0 ? (
                                        <p className="border-b border-border/50 px-3 py-2 text-xs text-muted-foreground print:px-2 print:py-1.5">
                                            Sin ítems todavía en este rubro.
                                        </p>
                                    ) : (
                                        section.lines.map((line) => (
                                            <div key={line.id}>
                                                <BudgetLineRow
                                                    line={line}
                                                    categoryNumber={
                                                        section.categoryNumber
                                                    }
                                                    onOpen={setPricingLine}
                                                />
                                                {isCollapsed ? null : (
                                                    <BudgetLineMobileRow
                                                        line={line}
                                                        showBreakdown
                                                        onOpen={setPricingLine}
                                                    />
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )
                        })
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
