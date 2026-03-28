import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
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

const requiredNonNegStr = z
    .string()
    .trim()
    .refine(
        (s) =>
            s !== '' &&
            Number.isFinite(Number(s.replace(',', '.'))) &&
            Number(s.replace(',', '.')) >= 0,
        'Tiene que ser un número ≥ 0'
    )

const schema = z.object({
    unitPriceStr: optionalNonNegStr,
    quantityStr: optionalNonNegStr,
    amountMaterialStr: requiredNonNegStr,
    amountLaborStr: requiredNonNegStr,
    amountEquipmentStr: requiredNonNegStr,
})

type FormValues = z.infer<typeof schema>

function toNum(s: string): number {
    return Number(s.replace(',', '.').trim())
}

interface EditBudgetLinePricingSheetProps {
    line: BudgetLineRow | null
    open: boolean
    onOpenChange: (open: boolean) => void
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
            unitPriceStr: '',
            quantityStr: '',
            amountMaterialStr: '0',
            amountLaborStr: '0',
            amountEquipmentStr: '0',
        },
    })

    useEffect(() => {
        if (!line || !open) {
            return
        }
        form.reset({
            unitPriceStr:
                line.unitPriceStored != null
                    ? String(line.unitPriceStored)
                    : '',
            quantityStr: String(line.quantity),
            amountMaterialStr: String(line.amountMaterial),
            amountLaborStr: String(line.amountLabor),
            amountEquipmentStr: String(line.amountEquipment),
        })
    }, [line, open, form])

    const onSubmit = async (values: FormValues) => {
        if (!line) {
            return
        }
        try {
            await apiFetch<BudgetLineRow>(
                `/v1/projects/${activeProject.id}/budget-lines/${line.id}`,
                {
                    method: 'PATCH',
                    token: accessToken,
                    studioSlug,
                    body: {
                        unitPrice:
                            values.unitPriceStr.trim() === ''
                                ? null
                                : toNum(values.unitPriceStr),
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
                queryKey: ['budget-lines', activeProject.id],
            })
            await queryClient.invalidateQueries({
                queryKey: ['dashboard', activeProject.id],
            })
            toast({
                title: 'Precios actualizados',
                description: line.description,
            })
            onOpenChange(false)
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'No se pudo guardar',
                description: getApiErrorMessage(err),
            })
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Precios y desglose</SheetTitle>
                    <SheetDescription>
                        {line?.description ?? 'Línea'} — el total es la suma de
                        materiales, mano de obra y equipo. Dejá el precio
                        unitario vacío para calcularlo a partir del total y la
                        cantidad.
                    </SheetDescription>
                </SheetHeader>
                {line ? (
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="mt-6 space-y-4"
                        >
                            <FormField
                                control={form.control}
                                name="unitPriceStr"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Precio unitario (ARS, opcional)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="decimal"
                                                placeholder="Vacío = derivado"
                                                {...field}
                                            />
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
                                        <FormLabel>Cantidad</FormLabel>
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
                            <FormField
                                control={form.control}
                                name="amountMaterialStr"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Materiales (ARS)</FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="decimal"
                                                {...field}
                                            />
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
                                        <FormLabel>
                                            Mano de obra (ARS)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="decimal"
                                                {...field}
                                            />
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
                                            <Input
                                                inputMode="decimal"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            La suma de los tres es el total de
                                            la línea.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <SheetFooter className="pt-4">
                                <Button
                                    type="submit"
                                    disabled={form.formState.isSubmitting}
                                >
                                    {form.formState.isSubmitting
                                        ? 'Guardando…'
                                        : 'Guardar'}
                                </Button>
                            </SheetFooter>
                        </form>
                    </Form>
                ) : null}
            </SheetContent>
        </Sheet>
    )
}
