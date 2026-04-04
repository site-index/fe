import { Plus, Trash2 } from 'lucide-react'

import type { ItemYieldLineInput } from '@/api/item-yields.api'
import type { ResourceRow } from '@/api/resources.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { MeasureUnitRow } from '@/types/measure-unit'

const UNIT_NONE = '__none__'

function parseNum(value: string, fallback = 0): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function createEmptyLine(resourceId: string): ItemYieldLineInput {
    return {
        resourceId,
        purchaseMeasureUnitId: null,
        purchaseLabel: '',
        purchaseMappingStatus: 'MAPPED',
        baseQuantity: 1,
        yieldPerPurchase: 1,
        wastePercent: 0,
        scalingMode: 'VARIABLE',
        stepSize: null,
        stepDriverKey: null,
        stepDriverSourceKey: null,
    }
}

type Props = {
    lines: ItemYieldLineInput[]
    resources: ResourceRow[]
    measureUnits: MeasureUnitRow[]
    disabled?: boolean
    onChange: (next: ItemYieldLineInput[]) => void
}

type LineRowProps = {
    index: number
    line: ItemYieldLineInput
    disabled: boolean
    measureUnits: MeasureUnitRow[]
    availableResources: ResourceRow[]
    selectedResource: ResourceRow | null
    onPatchLine: (index: number, patch: Partial<ItemYieldLineInput>) => void
    onRemoveLine: (index: number) => void
}

function StepFields({
    line,
    disabled,
    onPatch,
}: {
    line: ItemYieldLineInput
    disabled: boolean
    onPatch: (patch: Partial<ItemYieldLineInput>) => void
}) {
    if (line.scalingMode !== 'STEP') {
        return null
    }
    return (
        <div className="mt-2 space-y-2">
            <Input
                type="number"
                min="0.000001"
                step="0.0001"
                disabled={disabled}
                placeholder="Tamaño escalón"
                value={line.stepSize ?? ''}
                onChange={(event) =>
                    onPatch({
                        stepSize: parseNum(event.target.value, 0.000001),
                    })
                }
            />
            <Input
                disabled={disabled}
                placeholder="Driver key"
                value={line.stepDriverKey ?? ''}
                onChange={(event) =>
                    onPatch({
                        stepDriverKey: event.target.value,
                    })
                }
            />
            <Input
                disabled={disabled}
                placeholder="Source key (opcional)"
                value={line.stepDriverSourceKey ?? ''}
                onChange={(event) =>
                    onPatch({
                        stepDriverSourceKey: event.target.value,
                    })
                }
            />
        </div>
    )
}

function ItemYieldLineRow({
    index,
    line,
    disabled,
    measureUnits,
    availableResources,
    selectedResource,
    onPatchLine,
    onRemoveLine,
}: LineRowProps) {
    const resourceOptions = [
        ...availableResources,
        ...(selectedResource ? [selectedResource] : []),
    ]

    return (
        <tr key={`${line.resourceId}-${index}`} className="border-b align-top">
            <td className="px-2 py-2 min-w-56">
                <Select
                    value={line.resourceId}
                    disabled={disabled}
                    onValueChange={(value) =>
                        onPatchLine(index, { resourceId: value })
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {resourceOptions.map((resource) => (
                            <SelectItem key={resource.id} value={resource.id}>
                                {resource.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                    Base: {selectedResource?.baseMeasureUnit.name ?? '—'}
                </p>
            </td>
            <td className="px-2 py-2 min-w-28">
                <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    disabled={disabled}
                    value={line.baseQuantity}
                    onChange={(event) =>
                        onPatchLine(index, {
                            baseQuantity: parseNum(event.target.value),
                        })
                    }
                />
            </td>
            <td className="px-2 py-2 min-w-44">
                <Input
                    disabled={disabled}
                    placeholder="Ej. bolsa 25kg"
                    value={line.purchaseLabel ?? ''}
                    onChange={(event) =>
                        onPatchLine(index, {
                            purchaseLabel: event.target.value,
                        })
                    }
                />
            </td>
            <td className="px-2 py-2 min-w-44">
                <Select
                    value={line.purchaseMeasureUnitId ?? UNIT_NONE}
                    disabled={disabled}
                    onValueChange={(value) =>
                        onPatchLine(index, {
                            purchaseMeasureUnitId:
                                value === UNIT_NONE ? null : value,
                        })
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Sin unidad" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={UNIT_NONE}>Sin unidad</SelectItem>
                        {measureUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                                {unit.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </td>
            <td className="px-2 py-2 min-w-28">
                <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    disabled={disabled}
                    value={line.yieldPerPurchase}
                    onChange={(event) =>
                        onPatchLine(index, {
                            yieldPerPurchase: parseNum(event.target.value),
                        })
                    }
                />
            </td>
            <td className="px-2 py-2 min-w-24">
                <Input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={line.wastePercent}
                    onChange={(event) =>
                        onPatchLine(index, {
                            wastePercent: parseNum(event.target.value),
                        })
                    }
                />
            </td>
            <td className="px-2 py-2 min-w-28">
                <Select
                    value={line.scalingMode}
                    disabled={disabled}
                    onValueChange={(value) =>
                        onPatchLine(index, {
                            scalingMode: value as 'VARIABLE' | 'FIXED' | 'STEP',
                        })
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="VARIABLE">Variable</SelectItem>
                        <SelectItem value="FIXED">Fijo</SelectItem>
                        <SelectItem value="STEP">Escalón</SelectItem>
                    </SelectContent>
                </Select>
                <StepFields
                    line={line}
                    disabled={disabled}
                    onPatch={(patch) => onPatchLine(index, patch)}
                />
            </td>
            <td className="px-2 py-2 min-w-32">
                <Select
                    value={line.purchaseMappingStatus ?? 'MAPPED'}
                    disabled={disabled}
                    onValueChange={(value) =>
                        onPatchLine(index, {
                            purchaseMappingStatus: value as
                                | 'MAPPED'
                                | 'UNMAPPED',
                        })
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="MAPPED">Mapeado</SelectItem>
                        <SelectItem value="UNMAPPED">Sin mapear</SelectItem>
                    </SelectContent>
                </Select>
            </td>
            <td className="px-2 py-2 text-right">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    onClick={() => onRemoveLine(index)}
                    aria-label="Eliminar línea"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </td>
        </tr>
    )
}

export default function ItemYieldLinesEditor({
    lines,
    resources,
    measureUnits,
    disabled = false,
    onChange,
}: Props) {
    const resourceById = new Map(
        resources.map((resource) => [resource.id, resource])
    )
    const usedResourceIds = new Set(lines.map((line) => line.resourceId))
    const availableResources = resources.filter(
        (resource) => !usedResourceIds.has(resource.id)
    )

    const patchLine = (
        index: number,
        patch: Partial<ItemYieldLineInput>
    ): void => {
        onChange(
            lines.map((line, i) => (i === index ? { ...line, ...patch } : line))
        )
    }

    const removeLine = (index: number): void => {
        onChange(lines.filter((_, i) => i !== index))
    }

    const addLine = (): void => {
        const first = availableResources[0]
        if (!first) {
            return
        }
        onChange([...lines, createEmptyLine(first.id)])
    }

    return (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Líneas del rendimiento</p>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled || availableResources.length === 0}
                    onClick={addLine}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Agregar línea
                </Button>
            </div>
            {lines.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    Sin líneas todavía. Agregá al menos una para definir consumo
                    de recursos.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                                <th className="px-2 py-2 text-left">Recurso</th>
                                <th className="px-2 py-2 text-left">
                                    Cant. base
                                </th>
                                <th className="px-2 py-2 text-left">
                                    Etiqueta compra
                                </th>
                                <th className="px-2 py-2 text-left">
                                    Unidad compra
                                </th>
                                <th className="px-2 py-2 text-left">
                                    Rend. compra
                                </th>
                                <th className="px-2 py-2 text-left">% desp.</th>
                                <th className="px-2 py-2 text-left">Escala</th>
                                <th className="px-2 py-2 text-left">Estado</th>
                                <th className="px-2 py-2 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line, index) => (
                                <ItemYieldLineRow
                                    key={`${line.resourceId}-${index}`}
                                    index={index}
                                    line={line}
                                    disabled={disabled}
                                    measureUnits={measureUnits}
                                    availableResources={availableResources}
                                    selectedResource={
                                        resourceById.get(line.resourceId) ??
                                        null
                                    }
                                    onPatchLine={patchLine}
                                    onRemoveLine={removeLine}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
