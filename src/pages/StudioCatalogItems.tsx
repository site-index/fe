import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Library, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import {
    getMeasureUnits,
    getStudioCatalogItems,
    patchStudioCatalogItem,
    type StudioCatalogItemDefaultRow,
} from '@/api/catalog.api'
import PageDataWrapper from '@/components/PageDataWrapper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { getApiErrorMessage } from '@/lib/api'
import { qk } from '@/lib/query-keys'

type EditableLine = StudioCatalogItemDefaultRow['lines'][number]

function unresolvedCount(row: StudioCatalogItemDefaultRow): number {
    return row.lines.filter(
        (line) => (line.purchaseMappingStatus ?? 'MAPPED') === 'UNMAPPED'
    ).length
}

export default function StudioCatalogItems() {
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const queryClient = useQueryClient()
    const [editing, setEditing] = useState<StudioCatalogItemDefaultRow | null>(
        null
    )
    const [linesDraft, setLinesDraft] = useState<EditableLine[]>([])

    const {
        data: rows = [],
        isPending,
        error,
    } = useQuery<StudioCatalogItemDefaultRow[], Error>({
        queryKey: qk.studioCatalogItems,
        queryFn: () =>
            getStudioCatalogItems({
                token: accessToken,
                studioSlug,
            }),
        enabled: isQueryReady,
    })

    const { data: measureUnits = [] } = useQuery({
        queryKey: qk.measureUnits,
        queryFn: () =>
            getMeasureUnits({
                token: accessToken,
                studioSlug,
            }),
        enabled: isQueryReady,
    })

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!editing) return
            await patchStudioCatalogItem(
                editing.catalogItemId,
                {
                    measureUnitMode: editing.measureUnitMode,
                    ...(editing.measureUnitMode === 'OVERRIDE' &&
                    editing.measureUnit?.id
                        ? { measureUnitId: editing.measureUnit.id }
                        : {}),
                    basisOutputQty: editing.basisOutputQty,
                    components: {
                        linkedItems: editing.linkedItems,
                        lines: linesDraft.map((line) => ({
                            resourceId: line.resourceId,
                            purchaseMeasureUnitId: line.purchaseMeasureUnitId,
                            purchaseLabel: line.purchaseLabel ?? null,
                            purchaseMappingStatus:
                                line.purchaseMappingStatus ?? 'MAPPED',
                            baseQuantity: line.baseQuantity,
                            yieldPerPurchase: line.yieldPerPurchase,
                            wastePercent: line.wastePercent,
                            scalingMode: line.scalingMode,
                            stepSize: line.stepSize,
                            stepDriverKey: line.stepDriverKey,
                            stepDriverSourceKey: line.stepDriverSourceKey,
                        })),
                    },
                },
                {
                    token: accessToken,
                    studioSlug,
                }
            )
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: qk.studioCatalogItems,
            })
            toast.success('Mapeos guardados')
            setEditing(null)
        },
        onError: (error) => {
            toast.error('No se pudieron guardar los mapeos', {
                description: getApiErrorMessage(error),
            })
        },
    })

    function openEditor(row: StudioCatalogItemDefaultRow) {
        setEditing(row)
        setLinesDraft(
            row.lines.map((line) => ({
                ...line,
                purchaseMappingStatus: line.purchaseMappingStatus ?? 'MAPPED',
                purchaseLabel: line.purchaseLabel ?? '',
            }))
        )
    }

    function updateLine(
        index: number,
        patch: Partial<EditableLine & { purchaseMappingStatus?: string }>
    ) {
        setLinesDraft((prev) =>
            prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
        )
    }

    const rowsByWorkCategory = rows.reduce<
        Record<string, StudioCatalogItemDefaultRow[]>
    >((acc, row) => {
        const k = row.workCategoryName
        if (!acc[k]) acc[k] = []
        acc[k].push(row)
        return acc
    }, {})
    const workCategoryKeys = Object.keys(rowsByWorkCategory).sort()
    const editorTitle = useMemo(
        () => (editing ? `Mapeo de compras: ${editing.name}` : ''),
        [editing]
    )

    return (
        <>
            <PageDataWrapper
                title="Biblioteca del estudio"
                projectsLoading={false}
                emptyProject={false}
                isPending={isPending}
                error={error}
            >
                <div className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                                <Library className="h-7 w-7 text-muted-foreground" />
                                Biblioteca del estudio
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                                Rendimientos por defecto del estudio para cada
                                ítem del catálogo. Al crear una obra se copia
                                esta definición a la obra; cambios acá no
                                modifican obras ya creadas.
                            </p>
                        </div>
                        <Link
                            to="/item-yields"
                            className="text-sm text-primary hover:underline shrink-0"
                        >
                            Ver rendimientos de la obra →
                        </Link>
                    </div>

                    <div className="space-y-8">
                        {workCategoryKeys.map((workCategoryName) => (
                            <section key={workCategoryName}>
                                <h2 className="text-sm font-semibold text-muted-foreground mb-3 border-b border-border pb-1">
                                    {workCategoryName}
                                </h2>
                                <ul className="space-y-2">
                                    {rowsByWorkCategory[workCategoryName].map(
                                        (r) => {
                                            const unresolved =
                                                unresolvedCount(r)
                                            return (
                                                <li
                                                    key={r.catalogItemId}
                                                    className="rounded-lg border border-border bg-card px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                                                >
                                                    <div>
                                                        <p className="font-medium">
                                                            {r.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            {r.measureUnit
                                                                ?.name ??
                                                                r.measureUnit
                                                                    ?.code ??
                                                                '—'}{' '}
                                                            · {r.lines.length}{' '}
                                                            {r.lines.length ===
                                                            1
                                                                ? 'línea'
                                                                : 'líneas'}
                                                        </p>
                                                        {unresolved > 0 ? (
                                                            <p className="text-xs text-amber-700 mt-1">
                                                                {unresolved}{' '}
                                                                línea
                                                                {unresolved > 1
                                                                    ? 's'
                                                                    : ''}{' '}
                                                                sin mapear para
                                                                costos
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-xs text-muted-foreground">
                                                            {r.studioDefaultUpdatedAt
                                                                ? `Actualizado ${new Date(r.studioDefaultUpdatedAt).toLocaleString('es-AR')}`
                                                                : 'Sin definir aún (vacío en nuevas obras)'}
                                                        </p>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                openEditor(r)
                                                            }
                                                        >
                                                            Mapear compras
                                                        </Button>
                                                    </div>
                                                </li>
                                            )
                                        }
                                    )}
                                </ul>
                            </section>
                        ))}
                    </div>
                </div>
            </PageDataWrapper>

            <Dialog
                open={editing != null}
                onClose={() => setEditing(null)}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="w-full max-w-5xl rounded-xl border border-border bg-card shadow-xl max-h-[min(90vh,100dvh)] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <DialogTitle className="font-semibold">
                                {editorTitle}
                            </DialogTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditing(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-muted-foreground border-b">
                                        <th className="text-left py-2 pr-2">
                                            Recurso
                                        </th>
                                        <th className="text-left py-2 px-2">
                                            Etiqueta compra
                                        </th>
                                        <th className="text-left py-2 px-2">
                                            Unidad compra
                                        </th>
                                        <th className="text-left py-2 px-2">
                                            Rend. compra
                                        </th>
                                        <th className="text-left py-2 px-2">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {linesDraft.map((line, index) => (
                                        <tr
                                            key={line.resourceId}
                                            className="border-b align-top"
                                        >
                                            <td className="py-2 pr-2">
                                                <div className="font-medium">
                                                    {line.resourceName}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Base:{' '}
                                                    {line.baseMeasureUnit.name}
                                                </div>
                                            </td>
                                            <td className="py-2 px-2">
                                                <Input
                                                    value={
                                                        line.purchaseLabel ?? ''
                                                    }
                                                    onChange={(event) =>
                                                        updateLine(index, {
                                                            purchaseLabel:
                                                                event.target
                                                                    .value,
                                                        })
                                                    }
                                                    placeholder="Ej. bolsa 25kg"
                                                />
                                            </td>
                                            <td className="py-2 px-2 min-w-44">
                                                <Select
                                                    value={
                                                        line.purchaseMeasureUnitId ??
                                                        '__none__'
                                                    }
                                                    onValueChange={(value) =>
                                                        updateLine(index, {
                                                            purchaseMeasureUnitId:
                                                                value ===
                                                                '__none__'
                                                                    ? null
                                                                    : value,
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Sin unidad" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">
                                                            Sin unidad
                                                        </SelectItem>
                                                        {measureUnits.map(
                                                            (unit) => (
                                                                <SelectItem
                                                                    key={
                                                                        unit.id
                                                                    }
                                                                    value={
                                                                        unit.id
                                                                    }
                                                                >
                                                                    {unit.name}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="py-2 px-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.0001"
                                                    value={
                                                        Number.isFinite(
                                                            line.yieldPerPurchase
                                                        )
                                                            ? line.yieldPerPurchase
                                                            : 0
                                                    }
                                                    onChange={(event) =>
                                                        updateLine(index, {
                                                            yieldPerPurchase:
                                                                Number(
                                                                    event.target
                                                                        .value
                                                                ),
                                                        })
                                                    }
                                                />
                                            </td>
                                            <td className="py-2 px-2 min-w-40">
                                                <Select
                                                    value={
                                                        line.purchaseMappingStatus ??
                                                        'MAPPED'
                                                    }
                                                    onValueChange={(value) =>
                                                        updateLine(index, {
                                                            purchaseMappingStatus:
                                                                value as
                                                                    | 'MAPPED'
                                                                    | 'UNMAPPED',
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MAPPED">
                                                            Mapeado
                                                        </SelectItem>
                                                        <SelectItem value="UNMAPPED">
                                                            Sin mapear
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t px-4 py-3 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditing(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending || !editing}
                            >
                                {saveMutation.isPending
                                    ? 'Guardando…'
                                    : 'Guardar mapeos'}
                            </Button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
