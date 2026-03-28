import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

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
import type { BudgetLineRow } from '@/types/budget-line'

const nonNegStr = z
    .string()
    .trim()
    .refine(
        (s) =>
            s !== '' &&
            Number.isFinite(Number(s.replace(',', '.'))) &&
            Number(s.replace(',', '.')) >= 0,
        'Tiene que ser un número ≥ 0'
    )

const optionalNonNegStr = z
    .string()
    .trim()
    .refine(
        (s) =>
            s === '' ||
            (Number.isFinite(Number(s.replace(',', '.'))) &&
                Number(s.replace(',', '.')) >= 0),
        'Tiene que ser un número ≥ 0'
    )

const schema = z.object({
    amountMaterialStr: nonNegStr,
    amountLaborStr: nonNegStr,
    amountEquipmentStr: nonNegStr,
    quantityStr: optionalNonNegStr,
})

type FormValues = z.infer<typeof schema>

function toNum(s: string): number {
    return Number(s.replace(',', '.').trim())
}

function formatCurrency(value: number): string {
    return value.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
    })
}

function computePricingPreview(watched: {
    amountMaterialStr: string
    amountLaborStr: string
    amountEquipmentStr: string
    quantityStr: string
}): { computedTotal: number; computedUnitPrice: number | null } {
    const materialVal = watched.amountMaterialStr
        ? toNum(watched.amountMaterialStr)
        : 0
    const laborVal = watched.amountLaborStr ? toNum(watched.amountLaborStr) : 0
    const equipmentVal = watched.amountEquipmentStr
        ? toNum(watched.amountEquipmentStr)
        : 0
    const quantityVal = watched.quantityStr ? toNum(watched.quantityStr) : 0

    const computedTotal =
        Number.isFinite(materialVal) &&
        Number.isFinite(laborVal) &&
        Number.isFinite(equipmentVal)
            ? materialVal + laborVal + equipmentVal
            : 0
    const computedUnitPrice =
        quantityVal > 0 && Number.isFinite(computedTotal)
            ? computedTotal / quantityVal
            : null

    return { computedTotal, computedUnitPrice }
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
                    unitPrice: null,
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

interface EditBudgetLinePricingSheetProps {
    line: BudgetLineRow | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

function BudgetLinePricingFormFields({
    form,
    computedTotal,
    computedUnitPrice,
}: {
    form: ReturnType<typeof useForm<FormValues>>
    computedTotal: number
    computedUnitPrice: number | null
}) {
    return (
        <>
            <FormField
                control={form.control}
                name="amountMaterialStr"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Materiales (ARS)</FormLabel>
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
                        <FormLabel>Mano de obra (ARS)</FormLabel>
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
                        <FormLabel>Equipo (ARS)</FormLabel>
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
                        <FormLabel>Cantidad (opcional)</FormLabel>
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
                        <span className="text-muted-foreground">Total</span>
                        <span>{formatCurrency(computedTotal)}</span>
                    </div>
                    {computedUnitPrice !== null && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                Precio unitario
                            </span>
                            <span>{formatCurrency(computedUnitPrice)}</span>
                        </div>
                    )}
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
}: EditBudgetLinePricingSheetProps) {
    const { accessToken, studioSlug } = useAuth()
    const { activeProject } = useProject()
    const queryClient = useQueryClient()
    const { toast } = useToast()

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

    const { computedTotal, computedUnitPrice } = computePricingPreview({
        amountMaterialStr: watched.amountMaterialStr ?? '0',
        amountLaborStr: watched.amountLaborStr ?? '0',
        amountEquipmentStr: watched.amountEquipmentStr ?? '0',
        quantityStr: watched.quantityStr ?? '',
    })

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
                        {line?.description ?? 'Línea'} — el total es la suma de
                        materiales, mano de obra y equipo.
                    </SheetDescription>
                </SheetHeader>
                {line ? (
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="mt-6 space-y-4"
                        >
                            <BudgetLinePricingFormFields
                                form={form}
                                computedTotal={computedTotal}
                                computedUnitPrice={computedUnitPrice}
                            />
                        </form>
                    </Form>
                ) : null}
            </SheetContent>
        </Sheet>
    )
}
