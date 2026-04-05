import { useQuery } from '@tanstack/react-query'
import { ChevronsDown, ChevronsUp, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getProjectBudgetLines } from '@/api/budget-lines.api'
import { getWorkCategories } from '@/api/catalog.api'
import CreateBudgetLineDialog from '@/components/CreateBudgetLineDialog'
import PageDataWrapper from '@/components/PageDataWrapper'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useScope } from '@/contexts/ScopeContext'
import { qk } from '@/lib/query-keys'

import BudgetSectionBlock from './BudgetSectionBlock'
import { buildSections } from './helpers'

/* ------------------------------------------------------------------ */
/*  View-model hook                                                    */
/* ------------------------------------------------------------------ */

function useBudgetLinesVm() {
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const { isProjectScope } = useScope()
    const empty = activeProject.id === '__empty__'
    const queryEnabled =
        isQueryReady && isProjectScope && !empty && !projectsLoading

    const { data, isPending, error } = useQuery({
        queryKey: qk.budgetLines(studioSlug, activeProject.id),
        queryFn: () =>
            getProjectBudgetLines(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })

    const { data: categories = [], isPending: categoriesPending } = useQuery({
        queryKey: qk.workCategories(studioSlug),
        queryFn: () =>
            getWorkCategories({
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })

    return {
        projectsLoading,
        isProjectScope,
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

function BudgetLinesBody(vm: ReturnType<typeof useBudgetLinesVm>) {
    const navigate = useNavigate()
    const [collapsedSections, setCollapsedSections] = useState<
        Record<string, boolean>
    >({})
    const sections = buildSections(vm.rows, vm.categories)
    const sectionKeys = sections.map((section) => section.key)
    const allSectionsCollapsed =
        sectionKeys.length > 0 &&
        sectionKeys.every((key) => collapsedSections[key] ?? false)

    return (
        <PageDataWrapper
            title="Cómputo & Presupuesto"
            projectsLoading={vm.projectsLoading}
            emptyProject={vm.empty}
            emptyMessage="Elegí o creá un proyecto para ver el presupuesto."
            blockedByScope={!vm.isProjectScope}
            blockedMessage="Esta vista es por proyecto. Cambiá a modo Proyecto para continuar."
            isPending={vm.isPending}
            error={vm.error}
        >
            <div className="space-y-4 print:space-y-2">
                <div className="flex flex-wrap items-center justify-end gap-2 print:mb-2">
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

                            return (
                                <BudgetSectionBlock
                                    key={section.key}
                                    section={section}
                                    isCollapsed={isCollapsed}
                                    onToggle={() =>
                                        setCollapsedSections((prev) => ({
                                            ...prev,
                                            [section.key]: !(
                                                prev[section.key] ?? false
                                            ),
                                        }))
                                    }
                                    onOpen={(selectedLine) =>
                                        navigate(
                                            `/budget-lines/${selectedLine.id}/yield`
                                        )
                                    }
                                    onAdd={
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
                                    }
                                />
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
