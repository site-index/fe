import { useQuery } from '@tanstack/react-query'
import {
    ArrowLeft,
    ChevronRight,
    ExternalLink,
    FlaskConical,
    Plus,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import CreateItemYieldDialog from '@/components/CreateItemYieldDialog'
import PageDataWrapper from '@/components/PageDataWrapper'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { apiFetch } from '@/lib/api'

interface ItemYieldLine {
    id: string
    material: string
    unit: string
    quantityPerUnit: number
    purchaseUnit: string
    yieldPerPurchase: number
    wastePercent: number
}

interface ItemYield {
    id: string
    workCategoryId: string
    workCategoryName: string
    name: string
    description: string
    measureUnitMode: 'INHERIT' | 'OVERRIDE'
    measureUnit: { id: string; code: string; name: string } | null
    components: ItemYieldLine[]
    linkedItems: string[]
    /** Present when this row is a snapshot of a global catalog ítem. */
    catalogItemId: string | null
}

function itemUnitLabel(y: ItemYield): string {
    return y.measureUnit?.name ?? '—'
}

function calcPurchase(comp: ItemYieldLine, outputQty: number) {
    const net = comp.quantityPerUnit * outputQty
    const withWaste = net * (1 + comp.wastePercent / 100)
    const purchaseUnits = Math.ceil(withWaste / comp.yieldPerPurchase)
    return { net, withWaste, purchaseUnits }
}

function ConverterWidget({ itemYield }: { itemYield: ItemYield }) {
    const [quantity, setQuantity] = useState(10)

    return (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-semibold">Conversor paramétrico</p>
            <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">
                    Cantidad:
                </label>
                <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-24 rounded-md border border-input bg-card px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    min={0}
                    step={1}
                />
                <span className="text-sm font-mono text-muted-foreground">
                    {itemUnitLabel(itemYield)}
                </span>
            </div>

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-muted-foreground">
                        <th className="text-left py-1">Material</th>
                        <th className="text-right py-1">Neto</th>
                        <th className="text-right py-1">+Desperdicio</th>
                        <th className="text-right py-1">Compra</th>
                    </tr>
                </thead>
                <tbody>
                    {itemYield.components.map((comp) => {
                        const { net, withWaste, purchaseUnits } = calcPurchase(
                            comp,
                            quantity
                        )
                        return (
                            <tr
                                key={comp.id}
                                className="border-t border-border"
                            >
                                <td className="py-1.5">{comp.material}</td>
                                <td className="py-1.5 text-right font-mono">
                                    {net.toFixed(1)} {comp.unit}
                                </td>
                                <td className="py-1.5 text-right font-mono">
                                    {withWaste.toFixed(1)} {comp.unit}
                                </td>
                                <td className="py-1.5 text-right font-mono font-semibold">
                                    {purchaseUnits} {comp.purchaseUnit}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

function ItemYieldDetail({ d, onBack }: { d: ItemYield; onBack: () => void }) {
    return (
        <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Volver a rendimientos
            </Button>

            <div>
                <p className="text-xs text-muted-foreground mb-1">
                    {d.workCategoryName}
                </p>
                <h1 className="text-2xl font-black tracking-tight">{d.name}</h1>
                <p className="text-sm text-muted-foreground">{d.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-mono">
                        Unidad de ítem: {itemUnitLabel(d)}
                    </span>
                    {d.catalogItemId ? (
                        <span className="inline-block rounded border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                            Catálogo
                        </span>
                    ) : (
                        <span className="inline-block rounded border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary">
                            Personalizado
                        </span>
                    )}
                </div>
                {d.catalogItemId ? (
                    <p className="text-xs text-muted-foreground mt-2 max-w-xl">
                        Este rendimiento copia el ítem global del catálogo: el
                        rubro y el nombre del ítem vienen fijados por esa
                        definición (en la app no se editan acá).
                    </p>
                ) : null}
            </div>

            <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                                    Material
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Cant. / {itemUnitLabel(d)}
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Unidad
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Unidad de compra
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Rend. por compra
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    % desperdicio
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.components.map((comp) => (
                                <tr
                                    key={comp.id}
                                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                >
                                    <td className="px-4 py-3 font-medium">
                                        {comp.material}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {comp.quantityPerUnit}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">
                                        {comp.unit}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">
                                        {comp.purchaseUnit}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {comp.yieldPerPurchase}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {comp.wastePercent}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConverterWidget itemYield={d} />

            {d.linkedItems.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        Líneas de presupuesto vinculadas
                    </p>
                    <div className="space-y-1">
                        {d.linkedItems.map((id) => (
                            <Link
                                key={id}
                                to="/budget-lines"
                                className="block text-sm text-primary hover:underline"
                            >
                                Línea #{id} → Ver en presupuesto
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ItemYieldsGrid({
    itemYields,
    onSelect,
}: {
    itemYields: ItemYield[]
    onSelect: (id: string) => void
}) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {itemYields.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">
                    No hay rendimientos en esta obra. Si el catálogo está
                    sembrado, abrí esta página de nuevo para generar las filas
                    desde el catálogo, o creá un ítem personalizado.
                </p>
            ) : (
                itemYields.map((d) => (
                    <button
                        key={d.id}
                        type="button"
                        onClick={() => onSelect(d.id)}
                        className="rounded-lg border border-border bg-card p-5 shadow-sm text-left hover:shadow-md hover:border-primary/30 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-2 gap-2">
                            <FlaskConical className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            <div className="flex flex-wrap items-center justify-end gap-1">
                                {d.catalogItemId ? (
                                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                        Catálogo
                                    </span>
                                ) : (
                                    <span className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                                        Pers.
                                    </span>
                                )}
                                <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                                    {itemUnitLabel(d)}
                                </span>
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">
                            {d.workCategoryName}
                        </p>
                        <h3 className="font-bold mb-1">{d.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {d.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {d.components.length}{' '}
                                {d.components.length === 1
                                    ? 'componente'
                                    : 'componentes'}
                            </span>
                            <span className="flex items-center gap-1">
                                {d.linkedItems.length}{' '}
                                {d.linkedItems.length === 1
                                    ? 'vínculo'
                                    : 'vínculos'}{' '}
                                <ChevronRight className="h-3 w-3" />
                            </span>
                        </div>
                    </button>
                ))
            )}
        </div>
    )
}

export default function ItemYields() {
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const empty = activeProject.id === '__empty__'

    const {
        data: itemYields = [],
        isPending,
        error,
    } = useQuery({
        queryKey: ['item-yields', activeProject.id],
        queryFn: () =>
            apiFetch<ItemYield[]>(
                `/v1/projects/${activeProject.id}/item-yields`,
                {
                    token: accessToken,
                    studioSlug,
                }
            ),
        enabled: isQueryReady && !empty && !projectsLoading,
    })

    const selected = itemYields.find((d) => d.id === selectedId)

    if (selected) {
        return (
            <ItemYieldDetail d={selected} onBack={() => setSelectedId(null)} />
        )
    }

    return (
        <PageDataWrapper
            title="Rendimientos por ítem"
            projectsLoading={projectsLoading}
            emptyProject={empty}
            emptyMessage="Elegí un proyecto para ver los rendimientos por ítem."
            isPending={isPending}
            error={error}
        >
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                            Rendimientos por ítem
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Rendimientos de esta obra (copia del catálogo al
                            crear el proyecto). Los defaults del estudio se
                            editan en{' '}
                            <Link
                                to="/studio-catalog-items"
                                className="text-primary hover:underline"
                            >
                                Biblioteca del estudio
                            </Link>
                            .
                        </p>
                    </div>
                    <CreateItemYieldDialog
                        onCreated={setSelectedId}
                        trigger={
                            <Button size="sm">
                                <Plus className="h-4 w-4" />
                                Nuevo rendimiento
                            </Button>
                        }
                    />
                </div>

                <ItemYieldsGrid
                    itemYields={itemYields}
                    onSelect={setSelectedId}
                />
            </div>
        </PageDataWrapper>
    )
}
