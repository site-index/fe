import { useQuery } from '@tanstack/react-query'
import {
    ArrowLeft,
    ChevronRight,
    ExternalLink,
    FlaskConical,
    Pencil,
    Plus,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { getProjectItemYields } from '@/api/item-yields.api'
import CreateItemYieldDialog from '@/components/CreateItemYieldDialog'
import EditItemYieldDialog from '@/components/EditItemYieldDialog'
import PageDataWrapper from '@/components/PageDataWrapper'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useScope } from '@/contexts/ScopeContext'
import { qk } from '@/lib/query-keys'
import type { ItemYield, ItemYieldLine } from '@/types/item-yield'

function calcConsumption(comp: ItemYieldLine, outputQty: number) {
    return Math.max(0, comp.quantity) * Math.max(0, outputQty)
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
                    unidad de ítem
                </span>
            </div>

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-muted-foreground">
                        <th className="text-left py-1">Material</th>
                        <th className="text-right py-1">Cantidad</th>
                        <th className="text-right py-1">Unidad comercial</th>
                    </tr>
                </thead>
                <tbody>
                    {itemYield.components.map((comp) => {
                        const consumption = calcConsumption(comp, quantity)
                        return (
                            <tr
                                key={comp.resourceId}
                                className="border-t border-border"
                            >
                                <td className="py-1.5">{comp.resourceName}</td>
                                <td className="py-1.5 text-right font-mono">
                                    {comp.baseMeasureUnit.name}
                                    {' · '}
                                    {consumption.toFixed(2)}
                                </td>
                                <td className="py-1.5 text-right font-mono font-semibold">
                                    {comp.commercialMeasureUnit.name}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

function ItemYieldDetail({
    d,
    onBack,
    onEdit,
}: {
    d: ItemYield
    onBack: () => void
    onEdit: () => void
}) {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" /> Volver a rendimientos
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onEdit}
                >
                    <Pencil className="h-4 w-4" />
                    Editar
                </Button>
            </div>

            <div>
                <p className="text-xs text-muted-foreground mb-1">
                    {d.workCategoryName}
                </p>
                <h1 className="text-2xl font-black tracking-tight">{d.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    {d.catalogItemId ? (
                        <span className="inline-block rounded border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                            Catálogo
                        </span>
                    ) : (
                        <span className="inline-block rounded border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary">
                            Personalizado
                        </span>
                    )}
                    {d.catalogItemApprovalStatus === 'PENDING_APPROVAL' ? (
                        <span className="inline-block rounded border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700">
                            No aprobado
                        </span>
                    ) : null}
                </div>
                {d.catalogItemId ? (
                    <p className="text-xs text-muted-foreground mt-2 max-w-xl">
                        Este rendimiento copia el ítem global del catálogo: el
                        rubro y el nombre del ítem vienen fijados por esa
                        definición (en la app no se editan acá).
                    </p>
                ) : null}
                {d.catalogItemApprovalStatus === 'PENDING_APPROVAL' ? (
                    <p className="text-xs text-amber-700 mt-2 max-w-xl">
                        Este ítem y su rendimiento están en estado no aprobado
                        hasta que se apruebe el catalog item propuesto.
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
                                    Cantidad
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Unidad
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                                    Unidad comercial
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.components.map((comp) => (
                                <tr
                                    key={comp.resourceId}
                                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                >
                                    <td className="px-4 py-3 font-medium">
                                        {comp.resourceName}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {comp.quantity}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">
                                        {comp.baseMeasureUnit.name}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">
                                        {comp.commercialMeasureUnit.name}
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
                        Ítems de Cómputo & Presupuesto vinculados
                    </p>
                    <div className="space-y-1">
                        {d.linkedItems.map((id) => (
                            <Link
                                key={id}
                                to="/budget-lines"
                                className="block text-sm text-primary hover:underline"
                            >
                                Ítem #{id} → Ver en Cómputo & Presupuesto
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
                                {d.catalogItemApprovalStatus ===
                                'PENDING_APPROVAL' ? (
                                    <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">
                                        No ap.
                                    </span>
                                ) : null}
                                <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                                    {d.workCategoryName}
                                </span>
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">
                            {d.workCategoryName}
                        </p>
                        <h3 className="font-bold mb-1">{d.name}</h3>
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
    const [editOpen, setEditOpen] = useState(false)
    const { activeProject, projectsLoading } = useProject()
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const { isProjectScope } = useScope()
    const empty = activeProject.id === '__empty__'

    const {
        data: itemYields = [],
        isPending,
        error,
    } = useQuery({
        queryKey: qk.itemYields(activeProject.id),
        queryFn: () =>
            getProjectItemYields(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: isQueryReady && isProjectScope && !empty && !projectsLoading,
    })

    const selected = itemYields.find((d) => d.id === selectedId)

    if (selected) {
        return (
            <>
                <ItemYieldDetail
                    d={selected}
                    onBack={() => {
                        setEditOpen(false)
                        setSelectedId(null)
                    }}
                    onEdit={() => setEditOpen(true)}
                />
                <EditItemYieldDialog
                    itemYield={selected}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                />
            </>
        )
    }

    return (
        <PageDataWrapper
            title="Rendimientos por ítem"
            projectsLoading={projectsLoading}
            emptyProject={empty}
            emptyMessage="Elegí un proyecto para ver los rendimientos por ítem."
            blockedByScope={!isProjectScope}
            blockedMessage="Esta vista es por proyecto. Cambiá a modo Proyecto para continuar."
            isPending={isPending}
            error={error}
        >
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                            Rendimientos por ítem
                        </h1>
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
                    onSelect={(id) => {
                        setEditOpen(false)
                        setSelectedId(id)
                    }}
                />
            </div>
        </PageDataWrapper>
    )
}
