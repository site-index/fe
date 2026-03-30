import { zodResolver } from '@hookform/resolvers/zod'
import {
    type QueryClient,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { BudgetLineItemYieldSelect } from '@/components/BudgetLineItemYieldSelect'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useToast } from '@/hooks/use-toast'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import {
    formatCurrency,
    nonNegStr,
    optionalNonNegStr,
    toNum,
} from '@/lib/form-utils'
import type { BudgetLineRow } from '@/types/budget-line'

const schema = z.object({
    amountMaterialStr: nonNegStr,
    amountLaborStr: nonNegStr,
    amountEquipmentStr: nonNegStr,
    quantityStr: optionalNonNegStr,
})

type FormValues = z.infer<typeof schema>

function parseBudgetLineAmountStrings(watched: {
    amountMaterialStr: string
    amountLaborStr: string
    amountEquipmentStr: string
    quantityStr: string
}): { breakdownSum: number; qty: number } {
    const materialVal = watched.amountMaterialStr
        ? toNum(watched.amountMaterialStr)
        : 0
    const laborVal = watched.amountLaborStr ? toNum(watched.amountLaborStr) : 0
    const equipmentVal = watched.amountEquipmentStr
        ? toNum(watched.amountEquipmentStr)
        : 0
    const quantityVal = watched.quantityStr.trim()
        ? toNum(watched.quantityStr)
        : 0
    const qty =
        Number.isFinite(quantityVal) && quantityVal > 0 ? quantityVal : 0
    const partsOk =
        Number.isFinite(materialVal) &&
        Number.isFinite(laborVal) &&
        Number.isFinite(equipmentVal)
    const breakdownSum = partsOk ? materialVal + laborVal + equipmentVal : 0
    return { breakdownSum, qty }
}

function unitRateFromBreakdown(
    breakdownSum: number,
    unitPriceStored: number | null
): number {
    if (breakdownSum > 0) {
        return breakdownSum
    }
    return unitPriceStored ?? 0
}

function lineTotalFromUnitary(
    breakdownSum: number,
    qty: number,
    unitPriceStored: number | null
): number {
    if (breakdownSum > 0) {
        return breakdownSum * qty
    }
    if (qty > 0 && unitPriceStored != null) {
        return unitPriceStored * qty
    }
    return 0
}

/** Mirrors be BudgetLineService.effectiveDisplayUnitRate + effectiveBudgetLineTotal. */
function computePricingPreview(
    watched: {
        amountMaterialStr: string
        amountLaborStr: string
        amountEquipmentStr: string
        quantityStr: string
    },
    unitPriceStored: number | null
): { computedTotal: number; computedUnitPrice: number } {
    const { breakdownSum, qty } = parseBudgetLineAmountStrings(watched)
    return {
        computedUnitPrice: unitRateFromBreakdown(breakdownSum, unitPriceStored),
        computedTotal: lineTotalFromUnitary(breakdownSum, qty, unitPriceStored),
    }
}

function pricingPreviewFromLine(
    line: BudgetLineRow | null,
    watched: Partial<FormValues>
) {
    const unitLabel = line?.measureUnit?.name ?? '—'
    const { computedTotal, computedUnitPrice } = computePricingPreview(
        {
            amountMaterialStr: watched.amountMaterialStr ?? '0',
            amountLaborStr: watched.amountLaborStr ?? '0',
            amountEquipmentStr: watched.amountEquipmentStr ?? '0',
            quantityStr: watched.quantityStr ?? '',
        },
        line?.unitPriceStored ?? null
    )
    return { unitLabel, computedTotal, computedUnitPrice }
}

async function submitBudgetLinePricing(args: {
    line: BudgetLineRow
    values: FormValues
    projectId: string
    accessToken: string | null
    studioSlug: string | null
    queryClient: ReturnType<typeof useQueryClient>
    toast: ReturnType<typeof useToast>['toast']
    onSuccess: () => void
}): Promise<void> {
    const {
        line,
        values,
        projectId,
        accessToken,
        studioSlug,
        queryClient,
        toast,
        onSuccess,
    } = args
    try {
        await apiFetch<BudgetLineRow>(
            `/v1/projects/${projectId}/budget-lines/${line.id}`,
            {
                method: 'PATCH',
                token: accessToken,
                studioSlug,
                body: {
                    quantity:
                        values.quantityStr.trim() === ''
                            ? null
                            : toNum(values.quantityStr),
                    amountMaterial: toNum(values.amountMaterialStr),
                    amountLabor: toNum(values.amountLaborStr),
                    amountEquipment: toNum(values.amountEquipmentStr),
                },
            }
        )
        await queryClient.invalidateQueries({
            queryKey: ['budget-lines', projectId],
        })
        await queryClient.invalidateQueries({
            queryKey: ['dashboard', projectId],
        })
        toast({
            title: 'Precios actualizados',
            description: line.description,
        })
        onSuccess()
    } catch (err) {
        toast({
            variant: 'destructive',
            title: 'No se pudo guardar',
            description: getApiErrorMessage(err),
        })
    }
}

type ItemYieldOption = {
    id: string
    name: string
    workCategoryId: string
    workCategoryName: string
}

function useBudgetLineYieldLink(options: {
    line: BudgetLineRow | null
    open: boolean
    projectId: string
    accessToken: string | null
    studioSlug: string
    queryClient: QueryClient
    toast: ReturnType<typeof useToast>['toast']
    onLineUpdated?: (line: BudgetLineRow) => void
}) {
    const {
        line,
        open,
        projectId,
        accessToken,
        studioSlug,
        queryClient,
        toast,
        onLineUpdated,
    } = options

    const [yieldSaving, setYieldSaving] = useState(false)

    const yieldsQueryEnabled = open && projectId !== '__empty__'

    const { data: itemYields = [] } = useQuery({
        queryKey: ['item-yields', projectId, 'edit-sheet'],
        queryFn: () =>
            apiFetch<ItemYieldOption[]>(
                `/v1/projects/${projectId}/item-yields`,
                { token: accessToken, studioSlug }
            ),
        enabled: yieldsQueryEnabled,
    })

    const handleYieldChange = useCallback(
        async (budgetLineId: string, itemYieldId: string | null) => {
            if (!line || budgetLineId !== line.id) return
            setYieldSaving(true)
            try {
                const updated = await apiFetch<BudgetLineRow>(
                    `/v1/projects/${projectId}/budget-lines/${line.id}`,
                    {
                        method: 'PATCH',
                        token: accessToken,
                        studioSlug,
                        body: { itemYieldId },
                    }
                )
                await queryClient.invalidateQueries({
                    queryKey: ['budget-lines', projectId],
                })
                await queryClient.invalidateQueries({
                    queryKey: ['dashboard', projectId],
                })
                onLineUpdated?.(updated)
                toast({
                    title: 'Rendimiento actualizado',
                    description: updated.description,
                })
            } catch (err) {
                toast({
                    variant: 'destructive',
                    title: 'No se pudo actualizar el rendimiento',
                    description: getApiErrorMessage(err),
                })
            } finally {
                setYieldSaving(false)
            }
        },
        [
            line,
            projectId,
            accessToken,
            studioSlug,
            queryClient,
            toast,
            onLineUpdated,
        ]
    )

    return { itemYields, yieldSaving, handleYieldChange }
}

interface EditBudgetLinePricingSheetProps {
    line: BudgetLineRow | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onLineUpdated?: (line: BudgetLineRow) => void
}

function EditBudgetLineMetaBlock({
    line,
    itemYields,
    yieldSaving,
    onYieldChange,
}: {
    line: BudgetLineRow
    itemYields: ItemYieldOption[]
    yieldSaving: boolean
    onYieldChange: (budgetLineId: string, itemYieldId: string | null) => void
}) {
    return (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <div>
                <p className="text-xs text-muted-foreground">Descripción</p>
                <p className="text-sm font-medium leading-snug">
                    {line.description}
                </p>
            </div>
            <div>
                <p className="text-xs text-muted-foreground">Rubro</p>
                <p className="text-sm font-medium">{line.workCategoryName}</p>
                {line.itemYieldId ? (
                    <p className="text-xs text-muted-foreground mt-1">
                        Lo define el rendimiento vinculado.
                    </p>
                ) : null}
                {line.catalogItemId ? (
                    <p className="text-xs text-muted-foreground mt-1">
                        Rubro fijado por el ítem del catálogo. Si vinculás un
                        rendimiento, el rubro pasará a ser el del rendimiento.
                    </p>
                ) : null}
            </div>
            <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                    Rendimiento vinculado
                </p>
                <BudgetLineItemYieldSelect
                    line={line}
                    yields={itemYields}
                    disabled={yieldSaving}
                    onChange={onYieldChange}
                />
            </div>
        </div>
    )
}

function BudgetLinePricingFormFields({
    form,
    unitLabel,
    computedTotal,
    computedUnitPrice,
    showQuantityHint,
}: {
    form: ReturnType<typeof useForm<FormValues>>
    unitLabel: string
    computedTotal: number
    computedUnitPrice: number
    showQuantityHint: boolean
}) {
    return (
        <>
            <FormField
                control={form.control}
                name="amountMaterialStr"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Materiales (ARS / {unitLabel})</FormLabel>
                        <FormControl>
                            <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="amountLaborStr"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Mano de obra (ARS / {unitLabel})</FormLabel>
                        <FormControl>
                            <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="amountEquipmentStr"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Equipo (ARS / {unitLabel})</FormLabel>
                        <FormControl>
                            <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="quantityStr"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            Cantidad en {unitLabel} (opcional)
                        </FormLabel>
                        <FormControl>
                            <Input
                                inputMode="decimal"
                                placeholder="Vacío = sin cantidad"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <Card className="bg-muted/50">
                <CardContent className="py-3 px-4 space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                        <span className="text-muted-foreground">
                            Total de la línea
                        </span>
                        <span>{formatCurrency(computedTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            Precio unitario (ARS / {unitLabel})
                        </span>
                        <span>{formatCurrency(computedUnitPrice)}</span>
                    </div>
                    {showQuantityHint ? (
                        <p className="text-xs text-muted-foreground pt-1">
                            Indicá la cantidad para calcular el total de la
                            línea (importes unitarios × cantidad).
                        </p>
                    ) : null}
                </CardContent>
            </Card>

            <SheetFooter className="pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </SheetFooter>
        </>
    )
}

export default function EditBudgetLinePricingSheet({
    line,
    open,
    onOpenChange,
    onLineUpdated,
}: EditBudgetLinePricingSheetProps) {
    const { accessToken, studioSlug } = useAuth()
    const { activeProject } = useProject()
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { itemYields, yieldSaving, handleYieldChange } =
        useBudgetLineYieldLink({
            line,
            open,
            projectId: activeProject.id,
            accessToken,
            studioSlug,
            queryClient,
            toast,
            onLineUpdated,
        })

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            amountMaterialStr: '0',
            amountLaborStr: '0',
            amountEquipmentStr: '0',
            quantityStr: '',
        },
    })

    useEffect(() => {
        if (!line || !open) return
        form.reset({
            amountMaterialStr: String(line.amountMaterial),
            amountLaborStr: String(line.amountLabor),
            amountEquipmentStr: String(line.amountEquipment),
            quantityStr: line.quantity ? String(line.quantity) : '',
        })
    }, [line, open, form])

    const watched = useWatch<FormValues>({
        control: form.control,
        defaultValue: {
            amountMaterialStr: '0',
            amountLaborStr: '0',
            amountEquipmentStr: '0',
            quantityStr: '',
        },
    })

    const { unitLabel, computedTotal, computedUnitPrice } =
        pricingPreviewFromLine(line, watched)

    const { breakdownSum, qty } = parseBudgetLineAmountStrings({
        amountMaterialStr: watched.amountMaterialStr ?? '0',
        amountLaborStr: watched.amountLaborStr ?? '0',
        amountEquipmentStr: watched.amountEquipmentStr ?? '0',
        quantityStr: watched.quantityStr ?? '',
    })
    const showQuantityHint = breakdownSum > 0 && qty === 0

    const handleSubmit = (values: FormValues) => {
        if (!line) return
        void submitBudgetLinePricing({
            line,
            values,
            projectId: activeProject.id,
            accessToken,
            studioSlug,
            queryClient,
            toast,
            onSuccess: () => onOpenChange(false),
        })
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Precios y desglose</SheetTitle>
                    <SheetDescription>
                        {line?.description ?? 'Línea'} — unidad: {unitLabel}.
                        Los importes de materiales, mano de obra y equipo son
                        por unidad de medida; el total de la línea es cantidad ×
                        esa suma (o cantidad × precio unitario guardado si el
                        desglose está en cero).
                    </SheetDescription>
                </SheetHeader>
                {line ? (
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="mt-6 space-y-4"
                        >
                            <EditBudgetLineMetaBlock
                                line={line}
                                itemYields={itemYields}
                                yieldSaving={yieldSaving}
                                onYieldChange={handleYieldChange}
                            />
                            <BudgetLinePricingFormFields
                                form={form}
                                unitLabel={unitLabel}
                                computedTotal={computedTotal}
                                computedUnitPrice={computedUnitPrice}
                                showQuantityHint={showQuantityHint}
                            />
                        </form>
                    </Form>
                ) : null}
            </SheetContent>
        </Sheet>
    )
}
