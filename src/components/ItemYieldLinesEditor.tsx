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
import { cn } from '@/lib/utils'

function parseNum(value: string, fallback = 0): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function createEmptyLine(resourceId: string): ItemYieldLineInput {
    return {
        resourceId,
        quantity: 1,
    }
}

type Props = {
    lines: ItemYieldLineInput[]
    resources: ResourceRow[]
    pricesByResourceId: Map<string, number>
    disabled?: boolean
    onChange: (next: ItemYieldLineInput[]) => void
    onSetResourcePrice: (resourceId: string, unitPrice: number) => Promise<void>
}

type LineRowProps = {
    index: number
    line: ItemYieldLineInput
    disabled: boolean
    availableResources: ResourceRow[]
    selectedResource: ResourceRow | null
    pricesByResourceId: Map<string, number>
    onSetResourcePrice: (resourceId: string, unitPrice: number) => Promise<void>
    onPatchLine: (index: number, patch: Partial<ItemYieldLineInput>) => void
    onRemoveLine: (index: number) => void
}

function ItemYieldLineRow({
    index,
    line,
    disabled,
    availableResources,
    selectedResource,
    pricesByResourceId,
    onSetResourcePrice,
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
                        onPatchLine(index, { resourceId: value, quantity: 1 })
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
                    Unidad base: {selectedResource?.baseMeasureUnit.name ?? '—'}
                </p>
            </td>
            <td className="px-2 py-2 min-w-40">
                <div
                    className={cn(
                        'rounded-md border border-input bg-muted/40 px-3 py-2 text-sm',
                        disabled && 'opacity-70'
                    )}
                >
                    {selectedResource?.commercialMeasureUnit.name ?? '—'}
                </div>
            </td>
            <td className="px-2 py-2 min-w-32">
                <Input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={disabled || !selectedResource}
                    key={`price-${line.resourceId}`}
                    defaultValue={(
                        pricesByResourceId.get(line.resourceId) ?? 0
                    ).toFixed(2)}
                    onBlur={async (event) => {
                        if (!selectedResource) {
                            return
                        }
                        const unitPrice = parseNum(event.target.value, 0)
                        await onSetResourcePrice(selectedResource.id, unitPrice)
                    }}
                />
            </td>
            <td className="px-2 py-2 min-w-28">
                <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    disabled={disabled}
                    value={line.quantity}
                    onChange={(event) =>
                        onPatchLine(index, {
                            quantity: parseNum(event.target.value),
                        })
                    }
                />
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
    pricesByResourceId,
    disabled = false,
    onChange,
    onSetResourcePrice,
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
                                    Unidad comercial
                                </th>
                                <th className="px-2 py-2 text-left">Precio</th>
                                <th className="px-2 py-2 text-left">
                                    Cantidad
                                </th>
                                <th className="px-2 py-2 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line, index) => (
                                <ItemYieldLineRow
                                    key={`line-${index}`}
                                    index={index}
                                    line={line}
                                    disabled={disabled}
                                    availableResources={availableResources}
                                    selectedResource={
                                        resourceById.get(line.resourceId) ??
                                        null
                                    }
                                    pricesByResourceId={pricesByResourceId}
                                    onSetResourcePrice={onSetResourcePrice}
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
