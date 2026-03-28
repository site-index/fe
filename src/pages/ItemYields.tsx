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
    outputUnit: string
    components: ItemYieldLine[]
    linkedItems: string[]
}

function calcPurchase(comp: ItemYieldLine, outputQty: number) {
    const neto = comp.quantityPerUnit * outputQty
    const conDesperdicio = neto * (1 + comp.wastePercent / 100)
    const unidadesCompra = Math.ceil(conDesperdicio / comp.yieldPerPurchase)
    return { neto, conDesperdicio, unidadesCompra }
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
                    {itemYield.outputUnit}
                </span>
            </div>

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-muted-foreground">
                        <th className="text-left py-1">Material</th>
                        <th className="text-right py-1">Neto</th>
                        <th className="text-right py-1">+Desp.</th>
                        <th className="text-right py-1">Compra</th>
                    </tr>
                </thead>
                <tbody>
                    {itemYield.components.map((comp) => {
                        const { neto, conDesperdicio, unidadesCompra } =
                            calcPurchase(comp, quantity)
                        return (
                            <tr
                                key={comp.id}
                                className="border-t border-border"
                            >
                                <td className="py-1.5">{comp.material}</td>
                                <td className="py-1.5 text-right font-mono">
                                    {neto.toFixed(1)} {comp.unit}
                                </td>
                                <td className="py-1.5 text-right font-mono">
                                    {conDesperdicio.toFixed(1)} {comp.unit}
                                </td>
                                <td className="py-1.5 text-right font-mono font-semibold">
                                    {unidadesCompra} {comp.purchaseUnit}
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
            <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" /> Volver a rendimientos
            </button>

            <div>
                <p className="text-xs text-muted-foreground mb-1">
                    {d.workCategoryName}
                </p>
                <h1 className="text-2xl font-black tracking-tight">{d.name}</h1>
                <p className="text-sm text-muted-foreground">{d.description}</p>
                <span className="inline-block mt-1 rounded bg-muted px-2 py-0.5 text-xs font-mono">
                    Unidad del ítem: {d.outputUnit}
                </span>
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
                                    Cant. / {d.outputUnit}
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Unidad
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Unidad de compra
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Rend. / compra
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Desp. %
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
                    Todavía no hay rendimientos. Creá uno con el botón de arriba
                    o vía API.
                </p>
            ) : (
                itemYields.map((d) => (
                    <button
                        key={d.id}
                        type="button"
                        onClick={() => onSelect(d.id)}
                        className="rounded-lg border border-border bg-card p-5 shadow-sm text-left hover:shadow-md hover:border-primary/30 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <FlaskConical className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                                {d.outputUnit}
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">
                            {d.workCategoryName}
                        </p>
                        <h3 className="font-bold mb-1">{d.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {d.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{d.components.length} líneas</span>
                            <span className="flex items-center gap-1">
                                {d.linkedItems.length} vínculos{' '}
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
    const { accessToken, studioSlug } = useAuth()
    const empty = activeProject.id === '__empty__'

    const {
        data: itemYields = [],
        isPending,
        error,
    } = useQuery({
        queryKey: ['item-yields', activeProject.id, accessToken, studioSlug],
        queryFn: () =>
            apiFetch<ItemYield[]>(
                `/v1/projects/${activeProject.id}/item-yields`,
                {
                    token: accessToken,
                    studioSlug,
                }
            ),
        enabled:
            Boolean(accessToken && studioSlug.trim()) &&
            !empty &&
            !projectsLoading,
    })

    const selected = itemYields.find((d) => d.id === selectedId)

    if (selected) {
        return (
            <ItemYieldDetail d={selected} onBack={() => setSelectedId(null)} />
        )
    }

    return (
        <PageDataWrapper
            title="Rendimientos"
            projectsLoading={projectsLoading}
            emptyProject={empty}
            emptyMessage="Elegí un proyecto para ver los rendimientos."
            isPending={isPending}
            error={error}
        >
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                            Rendimientos
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Materiales, mano de obra y equipo por unidad de ítem
                            — carga manual (fase 1)
                        </p>
                    </div>
                    <CreateItemYieldDialog
                        onCreated={setSelectedId}
                        trigger={
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo rendimiento
                            </button>
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
