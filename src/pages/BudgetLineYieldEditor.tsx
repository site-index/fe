import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
    getProjectBudgetLines,
    patchProjectBudgetLine,
} from '@/api/budget-lines.api'
import {
    getProjectItemYields,
    type ItemYieldLineInput,
    patchProjectItemYield,
} from '@/api/item-yields.api'
import {
    getResourcePrices,
    getResources,
    type ResourceRow,
    setResourcePrice,
} from '@/api/resources.api'
import ItemYieldLinesEditor from '@/components/ItemYieldLinesEditor'
import PageDataWrapper from '@/components/PageDataWrapper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useScope } from '@/contexts/ScopeContext'
import { getApiErrorMessage } from '@/lib/api'
import { qk } from '@/lib/query-keys'
import {
    RESOURCE_KIND_EQUIPMENT,
    RESOURCE_KIND_LABOR,
    RESOURCE_KIND_MATERIAL,
} from '@/types/resource-kind'

const ZERO_VALUE = 0
const DECIMAL_SCALE = 2

function parseNum(value: string, fallback = ZERO_VALUE): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function deriveAmounts(args: {
    lines: ItemYieldLineInput[]
    pricesByResourceId: Map<string, number>
    resourcesById: Map<string, ResourceRow>
}): { material: number; labor: number; equipment: number } {
    const totals = {
        material: ZERO_VALUE,
        labor: ZERO_VALUE,
        equipment: ZERO_VALUE,
    }
    for (const line of args.lines) {
        const resource = args.resourcesById.get(line.resourceId)
        if (!resource) continue
        const lineCost =
            Math.max(ZERO_VALUE, line.quantity) *
            (args.pricesByResourceId.get(line.resourceId) ?? ZERO_VALUE)
        if (resource.kind === RESOURCE_KIND_MATERIAL)
            totals.material += lineCost
        if (resource.kind === RESOURCE_KIND_LABOR) totals.labor += lineCost
        if (resource.kind === RESOURCE_KIND_EQUIPMENT)
            totals.equipment += lineCost
    }
    return totals
}

function BackButton({ onBack }: { onBack: () => void }) {
    return (
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="active:scale-[0.98]">
            <ArrowLeft className="h-4 w-4" />
            Volver
        </Button>
    )
}

function EmptyState({
    message,
    onBack,
}: {
    message: string
    onBack: () => void
}) {
    return (
        <div className="space-y-4">
            <BackButton onBack={onBack} />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    )
}

function buildQueryEnabled(args: {
    isQueryReady: boolean
    isProjectScope: boolean
    empty: boolean
    projectsLoading: boolean
}): boolean {
    if (!args.isQueryReady) return false
    if (!args.isProjectScope) return false
    if (args.empty) return false
    if (args.projectsLoading) return false
    return true
}

function findBudgetLineById<T extends { id: string }>(
    rows: T[],
    budgetLineId: string
): T | null {
    return rows.find((line) => line.id === budgetLineId) ?? null
}

function findItemYieldByBudgetLine<T extends { id: string }>(
    rows: T[],
    itemYieldId: string | null | undefined
): T | null {
    if (!itemYieldId) return null
    return rows.find((yieldRow) => yieldRow.id === itemYieldId) ?? null
}

function useYieldEditorData() {
    const { budgetLineId = '' } = useParams()
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const { isProjectScope } = useScope()
    const empty = activeProject.id === '__empty__'
    const queryEnabled = buildQueryEnabled({
        isQueryReady,
        isProjectScope,
        empty,
        projectsLoading,
    })

    const {
        data: budgetLines = [],
        isPending,
        error,
    } = useQuery({
        queryKey: qk.budgetLines(studioSlug, activeProject.id),
        queryFn: () =>
            getProjectBudgetLines(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })
    const { data: itemYields = [] } = useQuery({
        queryKey: qk.itemYields(studioSlug, activeProject.id),
        queryFn: () =>
            getProjectItemYields(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })
    const { data: resources = [] } = useQuery({
        queryKey: qk.resources(studioSlug),
        queryFn: () =>
            getResources({
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })
    const { data: resourcePrices = [] } = useQuery({
        queryKey: qk.resourcePrices(studioSlug),
        queryFn: () =>
            getResourcePrices({
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })

    const budgetLine = findBudgetLineById(budgetLines, budgetLineId)
    const itemYield = findItemYieldByBudgetLine(
        itemYields,
        budgetLine?.itemYieldId
    )
    const pricesByResourceId = new Map(
        resourcePrices.map((row) => [row.resourceId, row.unitPrice] as const)
    )

    return {
        activeProjectId: activeProject.id,
        accessToken,
        studioSlug,
        projectsLoading,
        empty,
        isProjectScope,
        isPending,
        error,
        budgetLine,
        itemYield,
        resources,
        pricesByResourceId,
    }
}

function YieldEditorLoaded(args: {
    activeProjectId: string
    accessToken: string | null
    studioSlug: string
    budgetLine: { id: string; description: string; quantity: number }
    itemYield: {
        id: string
        linkedItems: string[]
        components: Array<{ resourceId: string; quantity: number }>
    }
    resources: ResourceRow[]
    pricesByResourceId: Map<string, number>
    onBack: () => void
}) {
    const queryClient = useQueryClient()
    const [lines, setLines] = useState<ItemYieldLineInput[]>(
        args.itemYield.components.map((line) => ({
            resourceId: line.resourceId,
            quantity: line.quantity,
        }))
    )
    const [quantity, setQuantity] = useState(args.budgetLine.quantity)
    const [saving, setSaving] = useState(false)
    const resourcesById = useMemo(
        () =>
            new Map(
                args.resources.map(
                    (resource) => [resource.id, resource] as const
                )
            ),
        [args.resources]
    )
    const perUnit = deriveAmounts({
        lines,
        pricesByResourceId: args.pricesByResourceId,
        resourcesById,
    })
    const unitPrice = perUnit.material + perUnit.labor + perUnit.equipment
    const total = unitPrice * Math.max(ZERO_VALUE, quantity)

    const onSetResourcePrice = async (
        resourceId: string,
        unitPriceValue: number
    ) => {
        const resource = args.resources.find((row) => row.id === resourceId)
        if (!resource) return
        await setResourcePrice(
            resourceId,
            {
                measureUnitId: resource.commercialMeasureUnit.id,
                unitPrice: unitPriceValue,
            },
            {
                token: args.accessToken,
                studioSlug: args.studioSlug,
            }
        )
        await queryClient.invalidateQueries({
            queryKey: qk.resourcePrices(args.studioSlug),
        })
    }

    const onSave = async () => {
        if (saving) return
        setSaving(true)
        try {
            await patchProjectItemYield(
                args.activeProjectId,
                args.itemYield.id,
                {
                    components: {
                        linkedItems: args.itemYield.linkedItems,
                        lines,
                    },
                },
                { token: args.accessToken, studioSlug: args.studioSlug }
            )
            await patchProjectBudgetLine(
                args.activeProjectId,
                args.budgetLine.id,
                { quantity },
                { token: args.accessToken, studioSlug: args.studioSlug }
            )
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: qk.itemYields(
                        args.studioSlug,
                        args.activeProjectId
                    ),
                }),
                queryClient.invalidateQueries({
                    queryKey: qk.budgetLines(
                        args.studioSlug,
                        args.activeProjectId
                    ),
                }),
                queryClient.invalidateQueries({
                    queryKey: qk.dashboard(
                        args.studioSlug,
                        args.activeProjectId
                    ),
                }),
            ])
            toast.success('Rendimiento actualizado', {
                description: args.budgetLine.description,
            })
        } catch (saveError) {
            toast.error('No se pudo guardar', {
                description: getApiErrorMessage(saveError),
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border border-border bg-background/80 p-2 backdrop-blur-sm sm:border-none sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                <BackButton onBack={args.onBack} />
                <Button
                    type="button"
                    size="sm"
                    onClick={onSave}
                    disabled={saving}
                    className="min-w-24 active:scale-[0.98]"
                >
                    {saving ? 'Guardando…' : 'Guardar'}
                </Button>
            </div>

            <div className="space-y-1.5 rounded-lg border border-border bg-card p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">Línea</p>
                <h1 className="line-clamp-2 text-base font-bold sm:text-lg">
                    {args.budgetLine.description}
                </h1>
                <p className="text-xs text-muted-foreground">
                    Editá recursos con el botón +. PU y MME se calculan
                    automáticamente.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-2.5 sm:p-3">
                    <p className="text-[11px] text-muted-foreground">
                        Cantidad
                    </p>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={quantity}
                        onChange={(event) =>
                            setQuantity(
                                parseNum(event.target.value, ZERO_VALUE)
                            )
                        }
                        className="h-9"
                    />
                </div>
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-2.5 sm:p-3">
                    <p className="text-[11px] text-muted-foreground">
                        PU (solo lectura)
                    </p>
                    <Input
                        value={unitPrice.toFixed(DECIMAL_SCALE)}
                        disabled
                        className="h-9"
                    />
                </div>
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-2.5 sm:p-3">
                    <p className="text-[11px] text-muted-foreground">
                        MME por unidad
                    </p>
                    <div className="flex flex-col gap-0.5 font-mono text-xs sm:flex-row sm:gap-1.5 sm:text-sm">
                        <span>MAT {perUnit.material.toFixed(DECIMAL_SCALE)}</span>
                        <span className="hidden sm:inline">·</span>
                        <span>MO {perUnit.labor.toFixed(DECIMAL_SCALE)}</span>
                        <span className="hidden sm:inline">·</span>
                        <span>EQ {perUnit.equipment.toFixed(DECIMAL_SCALE)}</span>
                    </div>
                </div>
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-2.5 sm:p-3">
                    <p className="text-[11px] text-muted-foreground">
                        Total estimado
                    </p>
                    <p className="font-mono text-sm font-semibold sm:text-base">
                        {total.toFixed(DECIMAL_SCALE)}
                    </p>
                </div>
            </div>

            <ItemYieldLinesEditor
                lines={lines}
                resources={args.resources}
                pricesByResourceId={args.pricesByResourceId}
                disabled={saving}
                onSetResourcePrice={onSetResourcePrice}
                onChange={setLines}
            />
        </div>
    )
}

export default function BudgetLineYieldEditor() {
    const navigate = useNavigate()
    const vm = useYieldEditorData()
    const onBack = () => navigate('/budget-lines')

    let content = (
        <EmptyState
            message="No se encontró la línea de presupuesto."
            onBack={onBack}
        />
    )
    if (vm.budgetLine && !vm.itemYield) {
        content = (
            <EmptyState
                message="Esta línea no tiene rendimiento vinculado."
                onBack={onBack}
            />
        )
    }
    if (vm.budgetLine && vm.itemYield) {
        content = (
            <YieldEditorLoaded
                key={`${vm.budgetLine.id}:${vm.itemYield.id}`}
                activeProjectId={vm.activeProjectId}
                accessToken={vm.accessToken}
                studioSlug={vm.studioSlug}
                budgetLine={{
                    id: vm.budgetLine.id,
                    description: vm.budgetLine.description,
                    quantity: vm.budgetLine.quantity,
                }}
                itemYield={{
                    id: vm.itemYield.id,
                    linkedItems: vm.itemYield.linkedItems,
                    components: vm.itemYield.components,
                }}
                resources={vm.resources}
                pricesByResourceId={vm.pricesByResourceId}
                onBack={onBack}
            />
        )
    }

    return (
        <PageDataWrapper
            title="Editor de rendimiento"
            projectsLoading={vm.projectsLoading}
            emptyProject={vm.empty}
            emptyMessage="Elegí un proyecto para editar rendimientos."
            blockedByScope={!vm.isProjectScope}
            blockedMessage="Esta vista es por proyecto. Cambiá a modo Proyecto para continuar."
            isPending={vm.isPending}
            error={vm.error}
        >
            {content}
        </PageDataWrapper>
    )
}
