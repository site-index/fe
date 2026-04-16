import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
    type ResourcePriceRow,
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
const PU_HOLD_DELAY_MS = 180

function parseNum(value: string, fallback = ZERO_VALUE): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function resolveLineMultiplier(args: {
    line: ItemYieldLineInput
    drivers: Record<string, number>
}): number {
    if (args.line.billingMode === 'FIXED') {
        return 1
    }
    if (args.line.billingMode === 'QUANTITY') {
        return args.drivers.quantity
    }
    if (args.line.billingMode === 'DURATION') {
        return args.drivers.duration
    }
    return Math.max(
        ZERO_VALUE,
        args.drivers[args.line.customDriverKey ?? ''] ?? ZERO_VALUE
    )
}

function deriveAmounts(args: {
    lines: ItemYieldLineInput[]
    pricesByResourceId: Map<string, number>
    resourcesById: Map<string, ResourceRow>
    budgetLineQuantity: number
}): { material: number; labor: number; equipment: number } {
    const totals = {
        material: ZERO_VALUE,
        labor: ZERO_VALUE,
        equipment: ZERO_VALUE,
    }
    const baseQuantity = Math.max(ZERO_VALUE, args.budgetLineQuantity)
    if (baseQuantity <= ZERO_VALUE) {
        return totals
    }
    const drivers: Record<string, number> = {
        quantity: baseQuantity,
        duration: ZERO_VALUE,
        perimeter: ZERO_VALUE,
        height: ZERO_VALUE,
    }
    for (const line of args.lines) {
        const resource = args.resourcesById.get(line.resourceId)
        if (!resource) continue
        const lineQuantity = Math.max(ZERO_VALUE, line.quantity)
        const unitPrice =
            args.pricesByResourceId.get(line.resourceId) ?? ZERO_VALUE
        const multiplier = resolveLineMultiplier({ line, drivers })
        const lineCost = (lineQuantity * unitPrice * multiplier) / baseQuantity
        if (resource.kind === RESOURCE_KIND_MATERIAL)
            totals.material += lineCost
        if (resource.kind === RESOURCE_KIND_LABOR) totals.labor += lineCost
        if (resource.kind === RESOURCE_KIND_EQUIPMENT)
            totals.equipment += lineCost
    }
    return totals
}

function mergeResourcesWithPriceRows(args: {
    resources: ResourceRow[]
    resourcePrices: ResourcePriceRow[]
}): ResourceRow[] {
    const resourcesById = new Map(
        args.resources.map((resource) => [resource.id, resource] as const)
    )
    for (const priceRow of args.resourcePrices) {
        if (resourcesById.has(priceRow.resourceId)) continue
        resourcesById.set(priceRow.resourceId, {
            id: priceRow.resourceId,
            code: priceRow.resourceCode,
            name: priceRow.resourceName,
            kind: priceRow.resourceKind,
            baseMeasureUnit: priceRow.baseMeasureUnit,
            commercialMeasureUnit: priceRow.measureUnit,
        })
    }
    return [...resourcesById.values()]
}

function BackButton({ onBack }: { onBack: () => void }) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="active:scale-[0.98]"
        >
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

function buildYieldEditorQueryState(args: {
    budgetLinesPending: boolean
    itemYieldsPending: boolean
    resourcesPending: boolean
    resourcePricesPending: boolean
    budgetLinesError: unknown
    itemYieldsError: unknown
    resourcesError: unknown
    resourcePricesError: unknown
}): { isPending: boolean; error: Error | null } {
    const isPending =
        args.budgetLinesPending ||
        args.itemYieldsPending ||
        args.resourcesPending ||
        args.resourcePricesPending
    const error = (args.budgetLinesError ??
        args.itemYieldsError ??
        args.resourcesError ??
        args.resourcePricesError ??
        null) as Error | null
    return { isPending, error }
}

function isLinkedYieldResolving(args: {
    budgetLine: { itemYieldId?: string | null } | null
    itemYield: { id: string } | null
    itemYieldsFetching: boolean
}): boolean {
    return Boolean(
        args.budgetLine?.itemYieldId &&
        !args.itemYield &&
        args.itemYieldsFetching
    )
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
        isPending: budgetLinesPending,
        isFetching: budgetLinesFetching,
        error: budgetLinesError,
    } = useQuery({
        queryKey: qk.budgetLines(studioSlug, activeProject.id),
        queryFn: () =>
            getProjectBudgetLines(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })
    const {
        data: itemYields = [],
        isPending: itemYieldsPending,
        isFetching: itemYieldsFetching,
        error: itemYieldsError,
    } = useQuery({
        queryKey: qk.itemYields(studioSlug, activeProject.id),
        queryFn: () =>
            getProjectItemYields(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })
    const {
        data: rawResources = [],
        isPending: resourcesPending,
        error: resourcesError,
    } = useQuery({
        queryKey: qk.resources(studioSlug),
        queryFn: () =>
            getResources({
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })
    const {
        data: resourcePrices = [],
        isPending: resourcePricesPending,
        error: resourcePricesError,
    } = useQuery({
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
    const resolvingLinkedYield = isLinkedYieldResolving({
        budgetLine,
        itemYield,
        itemYieldsFetching: itemYieldsFetching || budgetLinesFetching,
    })
    const pricesByResourceId = new Map(
        resourcePrices.map((row) => [row.resourceId, row.unitPrice] as const)
    )
    const resources = useMemo(
        () =>
            mergeResourcesWithPriceRows({
                resources: rawResources,
                resourcePrices,
            }),
        [rawResources, resourcePrices]
    )

    const queryState = buildYieldEditorQueryState({
        budgetLinesPending,
        itemYieldsPending,
        resourcesPending,
        resourcePricesPending,
        budgetLinesError,
        itemYieldsError,
        resourcesError,
        resourcePricesError,
    })

    return {
        activeProjectId: activeProject.id,
        accessToken,
        studioSlug,
        projectsLoading,
        empty,
        isProjectScope,
        isPending: queryState.isPending || resolvingLinkedYield,
        error: queryState.error,
        budgetLine,
        itemYield,
        resolvingLinkedYield,
        resources,
        pricesByResourceId,
    }
}

function YieldEditorLoaded(args: {
    activeProjectId: string
    accessToken: string | null
    studioSlug: string
    budgetLine: {
        id: string
        description: string
        quantity: number
        measureUnitName: string | null
        warnings?: string[]
    }
    itemYield: {
        id: string
        linkedItems: string[]
        components: Array<{
            resourceId: string
            quantity: number
            billingMode: ItemYieldLineInput['billingMode']
            customDriverKey: string | null
        }>
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
            billingMode: line.billingMode,
            customDriverKey: line.customDriverKey,
        }))
    )
    const [quantity, setQuantity] = useState(args.budgetLine.quantity)
    const [saving, setSaving] = useState(false)
    const [showMobileMmePreview, setShowMobileMmePreview] = useState(false)
    const [priceOverridesByResourceId, setPriceOverridesByResourceId] =
        useState<Map<string, number>>(new Map())
    const puHoldTimerRef = useRef<number | null>(null)
    const resourcesById = useMemo(
        () =>
            new Map(
                args.resources.map(
                    (resource) => [resource.id, resource] as const
                )
            ),
        [args.resources]
    )
    const effectivePricesByResourceId = useMemo(() => {
        const merged = new Map(args.pricesByResourceId)
        for (const [resourceId, price] of priceOverridesByResourceId) {
            merged.set(resourceId, price)
        }
        return merged
    }, [args.pricesByResourceId, priceOverridesByResourceId])

    const perUnit = deriveAmounts({
        lines,
        pricesByResourceId: effectivePricesByResourceId,
        resourcesById,
        budgetLineQuantity: quantity,
    })
    const hasNoResources = args.resources.length === ZERO_VALUE
    const hasNoYieldLines = lines.length === ZERO_VALUE
    const unitPrice = perUnit.material + perUnit.labor + perUnit.equipment
    const total = unitPrice * Math.max(ZERO_VALUE, quantity)

    useEffect(() => {
        return () => {
            if (puHoldTimerRef.current !== null) {
                window.clearTimeout(puHoldTimerRef.current)
            }
        }
    }, [])

    const startPuHold = () => {
        if (puHoldTimerRef.current !== null) {
            window.clearTimeout(puHoldTimerRef.current)
        }
        puHoldTimerRef.current = window.setTimeout(() => {
            setShowMobileMmePreview(true)
        }, PU_HOLD_DELAY_MS)
    }

    const endPuHold = () => {
        if (puHoldTimerRef.current !== null) {
            window.clearTimeout(puHoldTimerRef.current)
            puHoldTimerRef.current = null
        }
        setShowMobileMmePreview(false)
    }

    const onSetResourcePrice = async (
        resourceId: string,
        unitPriceValue: number
    ) => {
        const resource = args.resources.find((row) => row.id === resourceId)
        if (!resource) return
        let previousOverride = ZERO_VALUE
        let hadPreviousOverride = false
        setPriceOverridesByResourceId((current) => {
            hadPreviousOverride = current.has(resourceId)
            previousOverride = current.get(resourceId) ?? ZERO_VALUE
            const next = new Map(current)
            next.set(resourceId, unitPriceValue)
            return next
        })
        try {
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
        } catch (updatePriceError) {
            setPriceOverridesByResourceId((current) => {
                const next = new Map(current)
                if (hadPreviousOverride) {
                    next.set(resourceId, previousOverride)
                } else {
                    next.delete(resourceId)
                }
                return next
            })
            toast.error('No se pudo actualizar el precio', {
                description: getApiErrorMessage(updatePriceError),
            })
        }
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

            <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
                <h1 className="line-clamp-2 text-center text-base font-bold sm:text-lg">
                    {args.budgetLine.description}
                </h1>
                {args.budgetLine.warnings &&
                args.budgetLine.warnings.length > 0 ? (
                    <div className="mt-2 space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-800">
                        {args.budgetLine.warnings.map((warning) => (
                            <p key={warning}>{warning}</p>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="rounded-lg border border-border bg-card p-2.5 sm:hidden">
                <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1.5">
                        <p className="text-center text-[11px] text-muted-foreground">
                            Q
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
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5 pl-2">
                        <p className="text-center text-[11px] text-muted-foreground">
                            U
                        </p>
                        <p className="line-clamp-1 rounded-md border border-input bg-muted/40 px-2 py-1.5 text-center font-mono text-xs">
                            {args.budgetLine.measureUnitName ?? '—'}
                        </p>
                    </div>
                    <div className="relative pl-2">
                        <button
                            type="button"
                            onPointerDown={startPuHold}
                            onPointerUp={endPuHold}
                            onPointerLeave={endPuHold}
                            onPointerCancel={endPuHold}
                            className="w-full space-y-1.5 active:scale-[0.98]"
                        >
                            <p className="text-center text-[11px] text-muted-foreground">
                                PU
                            </p>
                            <p className="text-center font-mono text-xs font-semibold">
                                {unitPrice.toFixed(DECIMAL_SCALE)}
                            </p>
                        </button>
                        {showMobileMmePreview ? (
                            <div className="absolute bottom-full left-1/2 z-20 mb-1 w-36 -translate-x-1/2 rounded-md border border-border bg-background p-1.5 shadow-sm">
                                <div className="space-y-0.5 font-mono text-[10px] tabular-nums">
                                    <div className="grid grid-cols-[18px,1fr] items-center gap-x-1">
                                        <span className="text-center leading-none text-muted-foreground">
                                            M
                                        </span>
                                        <span className="text-right leading-none">
                                            {perUnit.material.toFixed(
                                                DECIMAL_SCALE
                                            )}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-[18px,1fr] items-center gap-x-1">
                                        <span className="text-center leading-none text-muted-foreground">
                                            MO
                                        </span>
                                        <span className="text-right leading-none">
                                            {perUnit.labor.toFixed(
                                                DECIMAL_SCALE
                                            )}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-[18px,1fr] items-center gap-x-1">
                                        <span className="text-center leading-none text-muted-foreground">
                                            E
                                        </span>
                                        <span className="text-right leading-none">
                                            {perUnit.equipment.toFixed(
                                                DECIMAL_SCALE
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <div className="space-y-1.5 pl-2">
                        <p className="text-center text-[11px] text-muted-foreground">
                            Total
                        </p>
                        <p className="text-center font-mono text-xs font-semibold">
                            {total.toFixed(DECIMAL_SCALE)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="hidden grid-cols-2 gap-3 sm:grid">
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-3">
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
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-3">
                    <p className="text-[11px] text-muted-foreground">
                        PU (solo lectura)
                    </p>
                    <Input
                        value={unitPrice.toFixed(DECIMAL_SCALE)}
                        disabled
                        className="h-9"
                    />
                </div>
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-3">
                    <p className="text-[11px] text-muted-foreground">
                        MME por unidad
                    </p>
                    <div className="flex flex-row gap-1.5 font-mono text-sm">
                        <span>
                            MAT {perUnit.material.toFixed(DECIMAL_SCALE)}
                        </span>
                        <span>·</span>
                        <span>MO {perUnit.labor.toFixed(DECIMAL_SCALE)}</span>
                        <span>·</span>
                        <span>
                            EQ {perUnit.equipment.toFixed(DECIMAL_SCALE)}
                        </span>
                    </div>
                </div>
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-3">
                    <p className="text-[11px] text-muted-foreground">
                        Total estimado
                    </p>
                    <p className="font-mono text-base font-semibold">
                        {total.toFixed(DECIMAL_SCALE)}
                    </p>
                </div>
            </div>

            {hasNoResources || hasNoYieldLines ? (
                <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    {hasNoResources
                        ? 'No hay recursos cargados en el estudio. Sin recursos no se puede calcular PU ni agregar líneas.'
                        : 'Este rendimiento todavía no tiene líneas. Agregá al menos una línea para calcular PU.'}
                </div>
            ) : null}

            <ItemYieldLinesEditor
                lines={lines}
                resources={args.resources}
                pricesByResourceId={effectivePricesByResourceId}
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
    if (vm.budgetLine && !vm.itemYield && !vm.resolvingLinkedYield) {
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
                    measureUnitName: vm.budgetLine.measureUnit?.name ?? null,
                    warnings: vm.budgetLine.warnings,
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
