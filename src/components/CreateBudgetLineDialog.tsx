import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useToast } from '@/hooks/use-toast'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import type { BudgetLineRow } from '@/types/budget-line'
import type { MeasureUnitRow } from '@/types/measure-unit'
import type { WorkCategoryRow } from '@/types/work-category'

const RUBRO_NONE = '__none__'
const UNIT_NONE = '__none__'

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
    description: z
        .string()
        .trim()
        .min(1, 'La descripción es obligatoria')
        .max(2000, 'Máximo 2000 caracteres'),
    workCategoryId: z.union([z.literal(RUBRO_NONE), z.string().uuid()]),
    measureUnitId: z.union([z.literal(UNIT_NONE), z.string().uuid()]),
    quantityStr: optionalNonNegStr,
    unitPriceStr: optionalNonNegStr,
    amountMaterialStr: optionalNonNegStr,
    amountLaborStr: optionalNonNegStr,
    amountEquipmentStr: optionalNonNegStr,
})

type FormValues = z.infer<typeof schema>

function toNum(s: string): number {
    return Number(s.replace(',', '.').trim())
}

interface CreateBudgetLineDialogProps {
    trigger?: ReactNode
}

export default function CreateBudgetLineDialog({
    trigger,
}: CreateBudgetLineDialogProps) {
    const [open, setOpen] = useState(false)
    const { accessToken, studioSlug } = useAuth()
    const { activeProject } = useProject()
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const defaultForm: FormValues = {
        description: '',
        workCategoryId: RUBRO_NONE,
        measureUnitId: UNIT_NONE,
        quantityStr: '',
        unitPriceStr: '',
        amountMaterialStr: '',
        amountLaborStr: '',
        amountEquipmentStr: '',
    }

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: defaultForm,
    })

    const { data: categories = [], isPending: categoriesLoading } = useQuery({
        queryKey: ['work-categories', accessToken, studioSlug],
        queryFn: () =>
            apiFetch<WorkCategoryRow[]>('/v1/work-categories', {
                token: accessToken,
                studioSlug,
            }),
        enabled: open && Boolean(accessToken && studioSlug.trim()),
    })

    const { data: measureUnits = [], isPending: measureUnitsLoading } =
        useQuery({
            queryKey: ['measure-units', accessToken, studioSlug],
            queryFn: () =>
                apiFetch<MeasureUnitRow[]>('/v1/measure-units', {
                    token: accessToken,
                    studioSlug,
                }),
            enabled: open && Boolean(accessToken && studioSlug.trim()),
        })

    const onSubmit = async (values: FormValues) => {
        try {
            const body: Record<string, unknown> = {
                description: values.description,
            }
            if (values.workCategoryId !== RUBRO_NONE) {
                body.workCategoryId = values.workCategoryId
            }
            if (values.measureUnitId !== UNIT_NONE) {
                body.measureUnitId = values.measureUnitId
            }
            if (values.quantityStr.trim() !== '') {
                body.quantity = toNum(values.quantityStr)
            }
            if (values.unitPriceStr.trim() !== '') {
                body.unitPrice = toNum(values.unitPriceStr)
            }
            if (values.amountMaterialStr.trim() !== '') {
                body.amountMaterial = toNum(values.amountMaterialStr)
            }
            if (values.amountLaborStr.trim() !== '') {
                body.amountLabor = toNum(values.amountLaborStr)
            }
            if (values.amountEquipmentStr.trim() !== '') {
                body.amountEquipment = toNum(values.amountEquipmentStr)
            }

            const created = await apiFetch<BudgetLineRow>(
                `/v1/projects/${activeProject.id}/budget-lines`,
                {
                    method: 'POST',
                    body,
                    token: accessToken,
                    studioSlug,
                }
            )
            await queryClient.invalidateQueries({
                queryKey: ['budget-lines', activeProject.id],
            })
            await queryClient.invalidateQueries({
                queryKey: ['dashboard', activeProject.id],
            })
            toast({
                title: 'Línea de presupuesto creada',
                description: created.description,
            })
            form.reset(defaultForm)
            setOpen(false)
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'No se pudo crear la línea',
                description: getApiErrorMessage(err),
            })
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v)
                if (!v) form.reset(defaultForm)
            }}
        >
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button type="button" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva línea
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva línea de presupuesto</DialogTitle>
                    <DialogDescription>
                        La descripción es obligatoria. Rubro, precio unitario,
                        cantidad y desglose por categoría son opcionales.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ej. Hormigón H21 — losa"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="workCategoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rubro (opcional)</FormLabel>
                                    <Select
                                        disabled={categoriesLoading}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger aria-label="Rubro">
                                                <SelectValue placeholder="Cargando…" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={RUBRO_NONE}>
                                                Sin rubro
                                            </SelectItem>
                                            {categories.map((c) => (
                                                <SelectItem
                                                    key={c.id}
                                                    value={c.id}
                                                >
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="measureUnitId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unidad (opcional)</FormLabel>
                                    <Select
                                        disabled={measureUnitsLoading}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger aria-label="Unidad">
                                                <SelectValue placeholder="Cargando…" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={UNIT_NONE}>
                                                Sin unidad
                                            </SelectItem>
                                            {measureUnits.map((u) => (
                                                <SelectItem
                                                    key={u.id}
                                                    value={u.id}
                                                >
                                                    {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name="quantityStr"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cantidad</FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="decimal"
                                                placeholder="—"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unitPriceStr"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>P. unitario ARS</FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="decimal"
                                                placeholder="—"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem
                                value="categoryAmounts"
                                className="border-b-0"
                            >
                                <AccordionTrigger className="py-2 text-sm">
                                    Desglose por categoría (opcional)
                                </AccordionTrigger>
                                <AccordionContent className="space-y-3 pt-1">
                                    <FormField
                                        control={form.control}
                                        name="amountMaterialStr"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Materiales (ARS)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        inputMode="decimal"
                                                        placeholder="0"
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
                                                        placeholder="0"
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
                                                <FormLabel>
                                                    Equipo (ARS)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        inputMode="decimal"
                                                        placeholder="0"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting
                                    ? 'Creando…'
                                    : 'Crear'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
