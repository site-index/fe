import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    ChevronRight,
    FlaskConical,
    HardHat,
    Package,
    Plus,
    Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { BudgetLineItemYieldSelect } from '@/components/BudgetLineItemYieldSelect'
import CreateBudgetLineDialog from '@/components/CreateBudgetLineDialog'
import EditBudgetLinePricingSheet from '@/components/EditBudgetLinePricingSheet'
import PageDataWrapper from '@/components/PageDataWrapper'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { apiFetch } from '@/lib/api'
import type { BudgetLineRow } from '@/types/budget-line'

export type { BudgetLineRow } from '@/types/budget-line'

type YieldOptionRow = { id: string; name: string }

function CategorySplitBar({
    materials,
    labor,
    equipment,
}: {
    materials: number
    labor: number
    equipment: number
}) {
    return (
        <div className="flex h-2 w-full overflow-hidden rounded-full">
            <div
                className="bg-graphite"
                style={{ width: `${materials}%` }}
                title={`Materiales ${materials}%`}
            />
            <div
                className="bg-positive"
                style={{ width: `${labor}%` }}
                title={`Mano de obra ${labor}%`}
            />
            <div
                className="bg-muted-foreground/40"
                style={{ width: `${equipment}%` }}
                title={`Equipo ${equipment}%`}
            />
        </div>
    )
}

function useBudgetLinesVm() {
    const queryClient = useQueryClient()
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug } = useAuth()
    const empty = activeProject.id === '__empty__'
    const queryEnabled =
        Boolean(accessToken && studioSlug.trim()) && !empty && !projectsLoading

    const { data, isPending, error } = useQuery({
        queryKey: ['budget-lines', activeProject.id, accessToken, studioSlug],
        queryFn: () =>
            apiFetch<BudgetLineRow[]>(
                `/v1/projects/${activeProject.id}/budget-lines`,
                {
                    token: accessToken,
                    studioSlug,
                }
            ),
        enabled: queryEnabled,
    })

    const { data: itemYieldOptions = [] } = useQuery({
        queryKey: ['item-yields', activeProject.id, accessToken, studioSlug],
        queryFn: () =>
            apiFetch<YieldOptionRow[]>(
                `/v1/projects/${activeProject.id}/item-yields`,
                {
                    token: accessToken,
                    studioSlug,
                }
            ),
        enabled: queryEnabled,
    })

    const patchItemYieldMutation = useMutation({
        mutationFn: ({
            budgetLineId,
            itemYieldId,
        }: {
            budgetLineId: string
            itemYieldId: string | null
        }) =>
            apiFetch<BudgetLineRow>(
                `/v1/projects/${activeProject.id}/budget-lines/${budgetLineId}`,
                {
                    method: 'PATCH',
                    token: accessToken,
                    studioSlug,
                    body: { itemYieldId },
                }
            ),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ['budget-lines', activeProject.id],
            })
        },
    })

    return {
        projectsLoading,
        empty,
        isPending,
        error: error as Error | null,
        rows: data ?? [],
        itemYieldOptions,
        patchItemYieldMutation,
    }
}

function BudgetLinesBody({
    projectsLoading,
    empty,
    isPending,
    error,
    rows,
    itemYieldOptions,
    patchItemYieldMutation,
}: ReturnType<typeof useBudgetLinesVm>) {
    const [pricingLine, setPricingLine] = useState<BudgetLineRow | null>(null)

    return (
        <PageDataWrapper
            title="Líneas de presupuesto"
            projectsLoading={projectsLoading}
            emptyProject={empty}
            emptyMessage="Elegí o creá un proyecto para ver las líneas de presupuesto."
            isPending={isPending}
            error={error}
        >
            <EditBudgetLinePricingSheet
                line={pricingLine}
                open={pricingLine != null}
                onOpenChange={(o) => {
                    if (!o) {
                        setPricingLine(null)
                    }
                }}
            />
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                            Líneas de presupuesto y APU
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Análisis de precio unitario — desglose: materiales ·
                            mano de obra · equipo
                        </p>
                    </div>
                    <CreateBudgetLineDialog
                        trigger={
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Nueva línea
                            </button>
                        }
                    />
                </div>

                <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-graphite" />{' '}
                        Materiales
                    </span>
                    <span className="flex items-center gap-1.5">
                        <HardHat className="h-3.5 w-3.5 text-positive" /> Mano
                        de obra
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-muted-foreground/60" />{' '}
                        Equipo
                    </span>
                </div>

                <div className="space-y-3 md:hidden">
                    {rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Todavía no hay líneas. Creá una con el botón de
                            arriba o vía API.
                        </p>
                    ) : (
                        rows.map((line) => (
                            <div
                                key={line.id}
                                className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-2"
                            >
                                <p className="text-xs text-muted-foreground">
                                    {line.trade}
                                </p>
                                <p
                                    className={`font-medium text-sm ${line.flaky ? 'data-flaky' : ''}`}
                                >
                                    {line.description}
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">
                                            Cant.:
                                        </span>{' '}
                                        <span className="font-mono">
                                            {line.quantity.toLocaleString(
                                                'es-AR'
                                            )}{' '}
                                            {line.unit}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">
                                            P.U.:
                                        </span>{' '}
                                        <span className="font-mono">
                                            $
                                            {line.unitPrice.toLocaleString(
                                                'es-AR'
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`text-sm font-mono font-semibold ${line.flaky ? 'data-flaky' : ''}`}
                                    >
                                        ${line.total.toLocaleString('es-AR')}
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <CategorySplitBar {...line.categoryBreakdown} />
                                <div className="pt-2 border-t border-border/60 space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        Rendimiento
                                    </p>
                                    <BudgetLineItemYieldSelect
                                        line={line}
                                        yields={itemYieldOptions}
                                        disabled={
                                            patchItemYieldMutation.isPending
                                        }
                                        onChange={(budgetLineId, yieldId) => {
                                            patchItemYieldMutation.mutate({
                                                budgetLineId,
                                                itemYieldId: yieldId,
                                            })
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPricingLine(line)}
                                    className="text-sm font-medium text-primary hover:underline"
                                >
                                    Precios / APU
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="hidden md:block rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                                        Rubro / descripción
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                        Unidad
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                        Cantidad
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                        P. unitario
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                        Total
                                    </th>
                                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground w-32">
                                        Desglose
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground min-w-[10rem]">
                                        Rendimiento
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                                        Precios
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-8 text-center text-muted-foreground"
                                        >
                                            Todavía no hay líneas. Creá una con
                                            el botón de arriba o vía API.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((line) => (
                                        <tr
                                            key={line.id}
                                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="text-xs text-muted-foreground">
                                                    {line.trade}
                                                </p>
                                                <p
                                                    className={`font-medium ${line.flaky ? 'data-flaky' : ''}`}
                                                >
                                                    {line.description}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs">
                                                {line.unit}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {line.quantity.toLocaleString(
                                                    'es-AR'
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                $
                                                {line.unitPrice.toLocaleString(
                                                    'es-AR'
                                                )}
                                            </td>
                                            <td
                                                className={`px-4 py-3 text-right font-mono font-semibold ${line.flaky ? 'data-flaky' : ''}`}
                                            >
                                                $
                                                {line.total.toLocaleString(
                                                    'es-AR'
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <CategorySplitBar
                                                    {...line.categoryBreakdown}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <BudgetLineItemYieldSelect
                                                    line={line}
                                                    yields={itemYieldOptions}
                                                    disabled={
                                                        patchItemYieldMutation.isPending
                                                    }
                                                    onChange={(
                                                        budgetLineId,
                                                        yieldId
                                                    ) => {
                                                        patchItemYieldMutation.mutate(
                                                            {
                                                                budgetLineId,
                                                                itemYieldId:
                                                                    yieldId,
                                                            }
                                                        )
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPricingLine(line)
                                                    }
                                                    className="text-sm font-medium text-primary hover:underline"
                                                >
                                                    Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <Link
                    to="/item-yields"
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                >
                    <FlaskConical className="h-6 w-6 text-muted-foreground" />
                    <div className="flex-1">
                        <p className="text-sm font-bold">Rendimientos</p>
                        <p className="text-xs text-muted-foreground">
                            Materiales, MO y equipo por unidad de ítem
                        </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
            </div>
        </PageDataWrapper>
    )
}

export default function BudgetLines() {
    const vm = useBudgetLinesVm()
    return <BudgetLinesBody {...vm} />
}
