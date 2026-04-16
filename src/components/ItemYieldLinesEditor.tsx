import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

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
import type { YieldLineBillingMode } from '@/types/item-yield'
import { RESOURCE_KIND_LABOR } from '@/types/resource-kind'

const DEFAULT_NUMERIC_FALLBACK = 0
const DEFAULT_LINE_QUANTITY = 1
const PRICE_DISPLAY_DECIMALS = 2
const PRICE_INPUT_PLACEHOLDER = '0'
const EMPTY_LINES_LENGTH = 0
const FIRST_ITEM_INDEX = 0
const DEFAULT_BILLING_MODE: YieldLineBillingMode = 'QUANTITY'
const CUSTOM_DRIVER_KEY_OPTIONS = [
    { key: 'quantity', label: 'Cantidad' },
    { key: 'duration', label: 'Duración' },
    { key: 'perimeter', label: 'Perímetro' },
    { key: 'height', label: 'Altura' },
] as const

function defaultBillingMode(): YieldLineBillingMode {
    return DEFAULT_BILLING_MODE
}

function parseNum(value: string, fallback = DEFAULT_NUMERIC_FALLBACK): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function createEmptyLine(resource: ResourceRow): ItemYieldLineInput {
    return {
        resourceId: resource.id,
        quantity: DEFAULT_LINE_QUANTITY,
        billingMode: defaultBillingMode(),
        customDriverKey: null,
    }
}

function formatPriceInputValue(value: number): string {
    return Number.isFinite(value) ? String(value) : PRICE_INPUT_PLACEHOLDER
}

function optionalPriceInputValue(
    value: number | undefined
): string | undefined {
    if (value === undefined) {
        return undefined
    }
    return formatPriceInputValue(value)
}

type Props = {
    lines: ItemYieldLineInput[]
    resources: ResourceRow[]
    pricesByResourceId: Map<string, number>
    disabled?: boolean
    flat?: boolean
    onChange: (next: ItemYieldLineInput[]) => void
    onSetResourcePrice: (resourceId: string, unitPrice: number) => Promise<void>
}

type LineRowProps = {
    index: number
    line: ItemYieldLineInput
    disabled: boolean
    selectableResources: ResourceRow[]
    selectedResource: ResourceRow | null
    pricesByResourceId: Map<string, number>
    onSetResourcePrice: (resourceId: string, unitPrice: number) => Promise<void>
    onPatchLine: (index: number, patch: Partial<ItemYieldLineInput>) => void
    onRemoveLine: (index: number) => void
}

function resourceChangePatch(resourceId: string): Partial<ItemYieldLineInput> {
    return {
        resourceId,
        quantity: DEFAULT_LINE_QUANTITY,
        billingMode: defaultBillingMode(),
        customDriverKey: null,
    }
}

function billingModePatch(
    line: ItemYieldLineInput,
    mode: YieldLineBillingMode
): Partial<ItemYieldLineInput> {
    return {
        billingMode: mode,
        customDriverKey:
            mode === 'CUSTOM_DRIVER'
                ? (line.customDriverKey ?? CUSTOM_DRIVER_KEY_OPTIONS[0].key)
                : null,
    }
}

async function commitResourcePrice(args: {
    selectedResource: ResourceRow | null
    inputValue: string
    onSetResourcePrice: (resourceId: string, unitPrice: number) => Promise<void>
}): Promise<void> {
    if (!args.selectedResource) {
        return
    }
    const unitPrice = parseNum(args.inputValue, DEFAULT_NUMERIC_FALLBACK)
    await args.onSetResourcePrice(args.selectedResource.id, unitPrice)
}

function renderLaborModeField(args: {
    isLabor: boolean
    line: ItemYieldLineInput
    disabled: boolean
    onPatchLine: (patch: Partial<ItemYieldLineInput>) => void
    triggerClassName?: string
}): ReactNode {
    if (!args.isLabor) {
        return <p className="px-2 py-2 text-xs text-muted-foreground">—</p>
    }
    return (
        <Select
            value={args.line.billingMode}
            disabled={args.disabled}
            onValueChange={(value: YieldLineBillingMode) =>
                args.onPatchLine(billingModePatch(args.line, value))
            }
        >
            <SelectTrigger className={args.triggerClassName}>
                <SelectValue placeholder="Modo" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="FIXED">Fijo por línea</SelectItem>
                <SelectItem value="QUANTITY">Escala por cantidad</SelectItem>
                <SelectItem value="DURATION">Escala por duración</SelectItem>
                <SelectItem value="CUSTOM_DRIVER">
                    Driver personalizado
                </SelectItem>
            </SelectContent>
        </Select>
    )
}

function renderLaborDriverField(args: {
    isLabor: boolean
    line: ItemYieldLineInput
    disabled: boolean
    onPatchLine: (patch: Partial<ItemYieldLineInput>) => void
    triggerClassName?: string
    emptyClassName?: string
}): ReactNode {
    if (!args.isLabor || args.line.billingMode !== 'CUSTOM_DRIVER') {
        return (
            <p
                className={
                    args.emptyClassName ??
                    'px-2 py-2 text-xs text-muted-foreground'
                }
            >
                —
            </p>
        )
    }
    return (
        <Select
            value={
                args.line.customDriverKey ?? CUSTOM_DRIVER_KEY_OPTIONS[0].key
            }
            disabled={args.disabled}
            onValueChange={(value) =>
                args.onPatchLine({
                    customDriverKey: value,
                })
            }
        >
            <SelectTrigger className={args.triggerClassName}>
                <SelectValue placeholder="Driver" />
            </SelectTrigger>
            <SelectContent>
                {CUSTOM_DRIVER_KEY_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

function ItemYieldLineRow({
    index,
    line,
    disabled,
    selectableResources,
    selectedResource,
    pricesByResourceId,
    onSetResourcePrice,
    onPatchLine,
    onRemoveLine,
}: LineRowProps) {
    const storedPrice = pricesByResourceId.get(line.resourceId)
    const isLabor = selectedResource?.kind === RESOURCE_KIND_LABOR
    const priceInputDefault = optionalPriceInputValue(storedPrice)
    const patchCurrentLine = (patch: Partial<ItemYieldLineInput>): void => {
        onPatchLine(index, patch)
    }
    return (
        <tr key={`${line.resourceId}-${index}`} className="border-b align-top">
            <td className="px-2 py-2 min-w-56">
                <Select
                    value={line.resourceId}
                    disabled={disabled}
                    onValueChange={(value) =>
                        patchCurrentLine(resourceChangePatch(value))
                    }
                >
                    <SelectTrigger>
                        <SelectValue
                            placeholder={
                                selectedResource?.name ??
                                'Seleccioná un recurso'
                            }
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {selectableResources.map((resource) => (
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
                    defaultValue={priceInputDefault}
                    placeholder={PRICE_INPUT_PLACEHOLDER}
                    onBlur={async (event) => {
                        await commitResourcePrice({
                            selectedResource,
                            inputValue: event.target.value,
                            onSetResourcePrice,
                        })
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
                        patchCurrentLine({
                            quantity: parseNum(event.target.value),
                        })
                    }
                />
            </td>
            <td className="px-2 py-2 min-w-44">
                {renderLaborModeField({
                    isLabor,
                    line,
                    disabled,
                    onPatchLine: patchCurrentLine,
                })}
            </td>
            <td className="px-2 py-2 min-w-44">
                {renderLaborDriverField({
                    isLabor,
                    line,
                    disabled,
                    onPatchLine: patchCurrentLine,
                })}
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

function ItemYieldLineMobileCard({
    index,
    line,
    disabled,
    selectableResources,
    selectedResource,
    pricesByResourceId,
    onSetResourcePrice,
    onPatchLine,
    onRemoveLine,
}: LineRowProps) {
    const storedPrice = pricesByResourceId.get(line.resourceId)
    const isLabor = selectedResource?.kind === RESOURCE_KIND_LABOR
    const currentPriceNumber = storedPrice ?? DEFAULT_NUMERIC_FALLBACK
    const currentPrice =
        storedPrice === undefined
            ? undefined
            : formatPriceInputValue(storedPrice)
    const subtotal = line.quantity * currentPriceNumber
    const patchCurrentLine = (patch: Partial<ItemYieldLineInput>): void => {
        onPatchLine(index, patch)
    }

    return (
        <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-3 transition-colors active:bg-muted/40">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Select
                        value={line.resourceId}
                        disabled={disabled}
                        onValueChange={(value) =>
                            patchCurrentLine(resourceChangePatch(value))
                        }
                    >
                        <SelectTrigger className="flex-1">
                            <SelectValue
                                placeholder={
                                    selectedResource?.name ??
                                    'Seleccioná un recurso'
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {selectableResources.map((resource) => (
                                <SelectItem
                                    key={resource.id}
                                    value={resource.id}
                                >
                                    {resource.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        onClick={() => onRemoveLine(index)}
                        className="h-8 w-8 shrink-0 active:scale-[0.98]"
                        aria-label="Eliminar línea"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="space-y-1">
                        <p className="text-center text-muted-foreground">Q</p>
                        <Input
                            type="number"
                            min="0"
                            step="0.0001"
                            disabled={disabled}
                            value={line.quantity}
                            onChange={(event) =>
                                patchCurrentLine({
                                    quantity: parseNum(event.target.value),
                                })
                            }
                            className="h-8 px-2 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <p className="text-center text-muted-foreground">U</p>
                        <p className="h-8 rounded-md border border-input bg-muted/40 px-2 py-2 font-mono text-xs">
                            {selectedResource?.commercialMeasureUnit.name ??
                                '—'}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-center text-muted-foreground">PU</p>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={disabled || !selectedResource}
                            key={`mobile-price-${line.resourceId}`}
                            defaultValue={currentPrice}
                            placeholder={PRICE_INPUT_PLACEHOLDER}
                            onBlur={async (event) => {
                                await commitResourcePrice({
                                    selectedResource,
                                    inputValue: event.target.value,
                                    onSetResourcePrice,
                                })
                            }}
                            className="h-8 px-2 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <p className="text-center text-muted-foreground">Sub</p>
                        <p className="h-8 rounded-md border border-input bg-muted/40 px-2 py-2 font-mono text-xs font-semibold">
                            {subtotal.toFixed(PRICE_DISPLAY_DECIMALS)}
                        </p>
                    </div>
                </div>
                {isLabor ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                            <p className="text-center text-muted-foreground">
                                Modo
                            </p>
                            {renderLaborModeField({
                                isLabor,
                                line,
                                disabled,
                                onPatchLine: patchCurrentLine,
                                triggerClassName: 'h-8 px-2 text-xs',
                            })}
                        </div>
                        <div className="space-y-1">
                            <p className="text-center text-muted-foreground">
                                Driver
                            </p>
                            {renderLaborDriverField({
                                isLabor,
                                line,
                                disabled,
                                onPatchLine: patchCurrentLine,
                                triggerClassName: 'h-8 px-2 text-xs',
                                emptyClassName:
                                    'h-8 rounded-md border border-input bg-muted/40 px-2 py-2 text-center text-xs text-muted-foreground',
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default function ItemYieldLinesEditor({
    lines,
    resources,
    pricesByResourceId,
    disabled = false,
    flat = false,
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
    const hasNoResources = resources.length === EMPTY_LINES_LENGTH
    const hasNoAvailableResources =
        availableResources.length === EMPTY_LINES_LENGTH
    const addLineDisabled = disabled || hasNoAvailableResources
    const getSelectableResources = (lineResourceId: string): ResourceRow[] => {
        const selected = resourceById.get(lineResourceId)
        const rest = resources.filter(
            (resource) =>
                resource.id !== lineResourceId &&
                !usedResourceIds.has(resource.id)
        )
        return selected ? [selected, ...rest] : rest
    }

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
        const first = availableResources[FIRST_ITEM_INDEX]
        if (!first) {
            return
        }
        onChange([...lines, createEmptyLine(first)])
    }

    return (
        <div
            className={cn(
                'space-y-2.5 sm:space-y-3',
                flat
                    ? ''
                    : 'rounded-lg border border-border bg-card p-2.5 sm:p-3'
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Líneas del rendimiento</p>
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={addLineDisabled}
                    onClick={addLine}
                    className="h-8 w-8 active:scale-[0.98]"
                    aria-label="Agregar línea"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
            </div>
            {!disabled && addLineDisabled ? (
                <p className="text-xs text-muted-foreground">
                    {hasNoResources
                        ? 'No hay recursos cargados en el estudio. Cargá recursos para agregar líneas.'
                        : 'Ya usaste todos los recursos disponibles en este rendimiento.'}
                </p>
            ) : null}
            {lines.length === EMPTY_LINES_LENGTH ? (
                <div className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center">
                    <p className="text-xs text-muted-foreground">
                        Sin líneas todavía. Agregá al menos una para definir
                        consumo de recursos.
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-2 md:hidden">
                        {lines.map((line, index) => (
                            <ItemYieldLineMobileCard
                                key={`mobile-line-${index}`}
                                index={index}
                                line={line}
                                disabled={disabled}
                                selectableResources={getSelectableResources(
                                    line.resourceId
                                )}
                                selectedResource={
                                    resourceById.get(line.resourceId) ?? null
                                }
                                pricesByResourceId={pricesByResourceId}
                                onSetResourcePrice={onSetResourcePrice}
                                onPatchLine={patchLine}
                                onRemoveLine={removeLine}
                            />
                        ))}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-xs text-muted-foreground">
                                    <th className="px-2 py-2 text-left">
                                        Recurso
                                    </th>
                                    <th className="px-2 py-2 text-left">
                                        Unidad comercial
                                    </th>
                                    <th className="px-2 py-2 text-left">
                                        Precio
                                    </th>
                                    <th className="px-2 py-2 text-left">
                                        Cantidad
                                    </th>
                                    <th className="px-2 py-2 text-left">
                                        Modo laboral
                                    </th>
                                    <th className="px-2 py-2 text-left">
                                        Driver laboral
                                    </th>
                                    <th className="px-2 py-2 text-right">
                                        Acción
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line, index) => (
                                    <ItemYieldLineRow
                                        key={`line-${index}`}
                                        index={index}
                                        line={line}
                                        disabled={disabled}
                                        selectableResources={getSelectableResources(
                                            line.resourceId
                                        )}
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
                </>
            )}
        </div>
    )
}
