import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { type Control, useForm } from 'react-hook-form'
import { z } from 'zod'

import { BudgetLineCreateDescriptionField } from '@/components/budget-line-create-description-field'
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
import type { SuggestionRow } from '@/components/use-budget-line-description-suggestions'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useToast } from '@/hooks/use-toast'
import { apiFetch, getApiErrorMessage } from '@/lib/api'
import { resolveOutputUnitToMeasureUnitId } from '@/lib/measure-unit-resolve'
import type { BudgetLineRow } from '@/types/budget-line'
import type { MeasureUnitRow } from '@/types/measure-unit'
import type { WorkCategoryRow } from '@/types/work-category'

const RUBRO_NONE = '__none__'
const UNIT_NONE = '__none__'

type LibraryBinding =
    | null
    | {
          kind: 'yield'
          yieldId: string
          workCategoryName: string
          outputUnit: string
      }
    | {
          kind: 'catalog'
          catalogItemId: string
          workCategoryId: string
          workCategoryName: string
          outputUnit: string
      }

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

function appendOptionalBudgetNumericFields(
    body: Record<string, unknown>,
    values: FormValues,
    unitNone: string
): void {
    if (values.measureUnitId !== unitNone) {
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
}

function CreateBudgetLineRubroSection({
    control,
    libraryBinding,
    categories,
    categoriesLoading,
    rubroNone,
}: {
    control: Control<FormValues>
    libraryBinding: LibraryBinding
    categories: WorkCategoryRow[]
    categoriesLoading: boolean
    rubroNone: string
}) {
    if (libraryBinding?.kind === 'yield') {
        return (
            <FormItem>
                <FormLabel>Rubro</FormLabel>
                <p className="text-sm font-medium rounded-md border border-input bg-muted/40 px-3 py-2">
                    {libraryBinding.workCategoryName}
                </p>
                <p className="text-xs text-muted-foreground">
                    Lo define el rendimiento vinculado a la biblioteca.
                </p>
            </FormItem>
        )
    }
    return (
        <FormField
            control={control}
            name="workCategoryId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Rubro (opcional)</FormLabel>
                    <Select
                        disabled={
                            categoriesLoading ||
                            libraryBinding?.kind === 'catalog'
                        }
                        onValueChange={field.onChange}
                        value={field.value}
                    >
                        <FormControl>
                            <SelectTrigger aria-label="Rubro">
                                <SelectValue placeholder="Cargando…" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value={rubroNone}>Sin rubro</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {libraryBinding?.kind === 'catalog' ? (
                        <p className="text-xs text-muted-foreground">
                            Rubro fijado por el ítem del catálogo.
                        </p>
                    ) : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}

function CreateBudgetLineMeasureUnitSection({
    control,
    libraryBinding,
    measureUnits,
    measureUnitsLoading,
    unitNone,
}: {
    control: Control<FormValues>
    libraryBinding: LibraryBinding
    measureUnits: MeasureUnitRow[]
    measureUnitsLoading: boolean
    unitNone: string
}) {
    if (libraryBinding != null) {
        const resolvedId = resolveOutputUnitToMeasureUnitId(
            libraryBinding.outputUnit,
            measureUnits
        )
        const out = libraryBinding.outputUnit.trim()

        if (resolvedId != null) {
            return (
                <FormField
                    control={control}
                    name="measureUnitId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Unidad (opcional)</FormLabel>
                            <Select
                                disabled
                                onValueChange={field.onChange}
                                value={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger aria-label="Unidad">
                                        <SelectValue placeholder="—" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={unitNone}>
                                        Sin unidad
                                    </SelectItem>
                                    {measureUnits.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {libraryBinding.kind === 'yield'
                                    ? 'La define el rendimiento vinculado a la biblioteca.'
                                    : 'La define el ítem del catálogo.'}
                            </p>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )
        }

        if (out !== '') {
            return (
                <FormItem>
                    <FormLabel>Unidad (opcional)</FormLabel>
                    <p className="text-sm font-medium rounded-md border border-input bg-muted/40 px-3 py-2">
                        {out}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        No coincide con una unidad del catálogo global; la línea
                        puede crearse sin unidad vinculada o podés desvincular
                        la biblioteca para elegir una.
                    </p>
                </FormItem>
            )
        }

        return (
            <FormItem>
                <FormLabel>Unidad (opcional)</FormLabel>
                <p className="text-sm font-medium rounded-md border border-input bg-muted/40 px-3 py-2">
                    Sin unidad
                </p>
                <p className="text-xs text-muted-foreground">
                    {libraryBinding.kind === 'yield'
                        ? 'La define el rendimiento vinculado a la biblioteca.'
                        : 'La define el ítem del catálogo.'}
                </p>
            </FormItem>
        )
    }

    return (
        <FormField
            control={control}
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
                            <SelectItem value={unitNone}>Sin unidad</SelectItem>
                            {measureUnits.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}

function buildBudgetLineCreateBody(
    values: FormValues,
    libraryBinding: LibraryBinding,
    rubroNone: string
): Record<string, unknown> {
    const body: Record<string, unknown> = {
        description: values.description,
    }
    if (libraryBinding?.kind === 'catalog') {
        body.catalogItemId = libraryBinding.catalogItemId
    } else {
        if (libraryBinding?.kind === 'yield') {
            body.itemYieldId = libraryBinding.yieldId
        }
        if (values.workCategoryId !== rubroNone) {
            body.workCategoryId = values.workCategoryId
        }
    }
    return body
}

interface CreateBudgetLineDialogProps {
    trigger?: ReactNode
}

export default function CreateBudgetLineDialog({
    trigger,
}: CreateBudgetLineDialogProps) {
    const [open, setOpen] = useState(false)
    const [libraryBinding, setLibraryBinding] = useState<LibraryBinding>(null)
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

    useEffect(() => {
        if (libraryBinding == null) {
            return
        }
        const resolved = resolveOutputUnitToMeasureUnitId(
            libraryBinding.outputUnit,
            measureUnits
        )
        if (resolved != null) {
            form.setValue('measureUnitId', resolved, { shouldValidate: true })
        }
    }, [libraryBinding, measureUnits, form])

    const handleSuggestionPick = (row: SuggestionRow) => {
        const resolvedId = resolveOutputUnitToMeasureUnitId(
            row.outputUnit,
            measureUnits
        )
        const measureUnitId = resolvedId ?? UNIT_NONE

        if (row.kind === 'yield') {
            form.setValue('description', row.name, { shouldValidate: true })
            form.setValue('workCategoryId', RUBRO_NONE, {
                shouldValidate: true,
            })
            form.setValue('measureUnitId', measureUnitId, {
                shouldValidate: true,
            })
            setLibraryBinding({
                kind: 'yield',
                yieldId: row.yieldId,
                workCategoryName: row.workCategoryName,
                outputUnit: row.outputUnit,
            })
        } else {
            form.setValue('description', row.name, { shouldValidate: true })
            form.setValue('workCategoryId', row.workCategoryId, {
                shouldValidate: true,
            })
            form.setValue('measureUnitId', measureUnitId, {
                shouldValidate: true,
            })
            setLibraryBinding({
                kind: 'catalog',
                catalogItemId: row.itemId,
                workCategoryId: row.workCategoryId,
                workCategoryName: row.workCategoryName,
                outputUnit: row.outputUnit,
            })
        }
    }

    const clearLibraryBinding = () => {
        setLibraryBinding(null)
        form.setValue('measureUnitId', UNIT_NONE, { shouldValidate: true })
        form.setValue('workCategoryId', RUBRO_NONE, { shouldValidate: true })
    }

    const onSubmit = async (values: FormValues) => {
        try {
            const body = buildBudgetLineCreateBody(
                values,
                libraryBinding,
                RUBRO_NONE
            )
            appendOptionalBudgetNumericFields(body, values, UNIT_NONE)

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
            setLibraryBinding(null)
            setOpen(false)
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'No se pudo crear la línea',
                description: getApiErrorMessage(err),
            })
        }
    }

    const resetDialog = () => {
        form.reset(defaultForm)
        setLibraryBinding(null)
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v)
                if (!v) {
                    resetDialog()
                }
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
                        La descripción es obligatoria. Mientras escribís, podés
                        elegir un rendimiento del proyecto o un ítem del
                        catálogo (búsqueda aproximada). Rubro, precio unitario,
                        cantidad y desglose por categoría son opcionales; el
                        desglose es por unidad de medida.
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
                                <BudgetLineCreateDescriptionField
                                    key={
                                        open
                                            ? 'budget-desc-open'
                                            : 'budget-desc-closed'
                                    }
                                    name={field.name}
                                    value={field.value}
                                    onBlur={field.onBlur}
                                    inputRef={field.ref}
                                    onInputChange={(e) => {
                                        field.onChange(e)
                                    }}
                                    dialogOpen={open}
                                    projectId={activeProject.id}
                                    accessToken={accessToken}
                                    studioSlug={studioSlug}
                                    libraryBound={libraryBinding != null}
                                    onClearLibraryBinding={clearLibraryBinding}
                                    onSuggestionPick={handleSuggestionPick}
                                />
                            )}
                        />
                        <CreateBudgetLineRubroSection
                            control={form.control}
                            libraryBinding={libraryBinding}
                            categories={categories}
                            categoriesLoading={categoriesLoading}
                            rubroNone={RUBRO_NONE}
                        />
                        <CreateBudgetLineMeasureUnitSection
                            control={form.control}
                            libraryBinding={libraryBinding}
                            measureUnits={measureUnits}
                            measureUnitsLoading={measureUnitsLoading}
                            unitNone={UNIT_NONE}
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
                                        <FormLabel>
                                            P. unitario (ARS / unidad)
                                        </FormLabel>
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
                                    Desglose por categoría (opcional, por
                                    unidad)
                                </AccordionTrigger>
                                <AccordionContent className="space-y-3 pt-1">
                                    <p className="text-xs text-muted-foreground">
                                        Importes en ARS por cada unidad de
                                        medida de la línea (no el total de la
                                        obra).
                                    </p>
                                    <FormField
                                        control={form.control}
                                        name="amountMaterialStr"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Materiales (ARS / unidad)
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
                                                    Mano de obra (ARS / unidad)
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
                                                    Equipo (ARS / unidad)
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
