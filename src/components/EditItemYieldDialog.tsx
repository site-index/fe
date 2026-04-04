import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getMeasureUnits, getWorkCategories } from '@/api/catalog.api'
import {
    type ItemYieldLineInput,
    patchProjectItemYield,
} from '@/api/item-yields.api'
import { getResources } from '@/api/resources.api'
import ItemYieldLinesEditor from '@/components/ItemYieldLinesEditor'
import { Button } from '@/components/ui/button'
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
import { getApiErrorMessage } from '@/lib/api'
import { qk } from '@/lib/query-keys'
import type { ItemYield } from '@/types/item-yield'
import type { MeasureUnitRow } from '@/types/measure-unit'
import type { WorkCategoryRow } from '@/types/work-category'

const schema = z.object({
    workCategoryId: z
        .string()
        .min(1, 'Elegí un rubro')
        .uuid('Elegí un rubro válido'),
    name: z
        .string()
        .trim()
        .min(1, 'El nombre es obligatorio')
        .max(500, 'Máximo 500 caracteres'),
    description: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
    measureUnitId: z
        .string()
        .uuid('Elegí una unidad de medida válida')
        .min(1, 'Elegí una unidad de medida'),
    basisOutputQty: z.number().positive('La base debe ser mayor que 0'),
})

type FormValues = z.infer<typeof schema>

type Props = {
    itemYield: ItemYield | null
    open: boolean
    onOpenChange: (next: boolean) => void
}

type CatalogData = {
    categories: WorkCategoryRow[]
    categoriesLoading: boolean
    measureUnits: MeasureUnitRow[]
    measureUnitsLoading: boolean
}

function isCatalogQueriesEnabled(
    open: boolean,
    accessToken: string | null,
    studioSlug: string
): boolean {
    return open && Boolean(accessToken && studioSlug.trim())
}

function canSubmitEditItemYieldForm(args: {
    categoriesLoading: boolean
    measureUnitsLoading: boolean
    categoriesLen: number
    measureUnitsLen: number
    isSubmitting: boolean
}): boolean {
    return (
        !args.categoriesLoading &&
        !args.measureUnitsLoading &&
        args.categoriesLen > 0 &&
        args.measureUnitsLen > 0 &&
        !args.isSubmitting
    )
}

function trimOrNull(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? ''
    return normalized === '' ? null : normalized
}

function normalizeStepFields(line: ItemYieldLineInput): {
    stepSize: number | null
    stepDriverKey: string | null
    stepDriverSourceKey: string | null
} {
    if (line.scalingMode !== 'STEP') {
        return {
            stepSize: null,
            stepDriverKey: null,
            stepDriverSourceKey: null,
        }
    }
    return {
        stepSize: line.stepSize ?? 0.000001,
        stepDriverKey: trimOrNull(line.stepDriverKey) ?? 'outputQty',
        stepDriverSourceKey: trimOrNull(line.stepDriverSourceKey),
    }
}

function normalizeLineForSubmit(line: ItemYieldLineInput): ItemYieldLineInput {
    const step = normalizeStepFields(line)
    return {
        ...line,
        purchaseLabel: trimOrNull(line.purchaseLabel),
        purchaseMappingStatus: line.purchaseMappingStatus ?? 'MAPPED',
        ...step,
    }
}

function useDialogDefaults(
    open: boolean,
    itemYield: ItemYield | null,
    form: UseFormReturn<FormValues>,
    setLines: (next: ItemYieldLineInput[]) => void
): void {
    useEffect(() => {
        if (!open || !itemYield) {
            return
        }
        form.reset({
            workCategoryId: itemYield.workCategoryId,
            name: itemYield.name,
            description: itemYield.description ?? '',
            measureUnitId: itemYield.measureUnit?.id ?? '',
            basisOutputQty: itemYield.basisOutputQty ?? 1,
        })
        setLines(
            itemYield.components.map((line) => ({
                resourceId: line.resourceId,
                purchaseMeasureUnitId: line.purchaseMeasureUnitId ?? null,
                purchaseLabel: line.purchaseLabel ?? '',
                purchaseMappingStatus: line.purchaseMappingStatus ?? 'MAPPED',
                baseQuantity: line.baseQuantity,
                yieldPerPurchase: line.yieldPerPurchase,
                wastePercent: line.wastePercent,
                scalingMode: line.scalingMode,
                stepSize: line.stepSize,
                stepDriverKey: line.stepDriverKey,
                stepDriverSourceKey: line.stepDriverSourceKey,
            }))
        )
    }, [form, itemYield, open, setLines])
}

function EditItemYieldForm({
    form,
    onSubmit,
    canSubmit,
    lines,
    setLines,
    resources,
    catalog,
}: {
    form: UseFormReturn<FormValues>
    onSubmit: (values: FormValues) => Promise<void>
    canSubmit: boolean
    lines: ItemYieldLineInput[]
    setLines: (next: ItemYieldLineInput[]) => void
    resources: Awaited<ReturnType<typeof getResources>>
    catalog: CatalogData
}) {
    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex min-h-0 flex-1 flex-col"
            >
                <div className="flex-1 space-y-4 overflow-y-auto py-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="workCategoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rubro</FormLabel>
                                    <Select
                                        disabled={catalog.categoriesLoading}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger aria-label="Rubro">
                                                <SelectValue placeholder="Elegí un rubro" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {catalog.categories.map(
                                                (category) => (
                                                    <SelectItem
                                                        key={category.id}
                                                        value={category.id}
                                                    >
                                                        {category.name}
                                                    </SelectItem>
                                                )
                                            )}
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
                                    <FormLabel>Unidad del ítem</FormLabel>
                                    <Select
                                        disabled={catalog.measureUnitsLoading}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger aria-label="Unidad de medida">
                                                <SelectValue placeholder="Elegí una unidad" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {catalog.measureUnits.map(
                                                (unit) => (
                                                    <SelectItem
                                                        key={unit.id}
                                                        value={unit.id}
                                                    >
                                                        {unit.name}
                                                    </SelectItem>
                                                )
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Ej. Hormigón H21"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Descripción (opcional)</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Notas breves"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="basisOutputQty"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cantidad base</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        step="0.0001"
                                        min="0.0001"
                                        value={field.value}
                                        onChange={(event) =>
                                            field.onChange(
                                                Number(event.target.value)
                                            )
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <ItemYieldLinesEditor
                        lines={lines}
                        resources={resources}
                        measureUnits={catalog.measureUnits}
                        disabled={form.formState.isSubmitting}
                        onChange={setLines}
                    />
                </div>
                <div className="flex shrink-0 justify-end border-t px-0 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <Button type="submit" disabled={!canSubmit}>
                        {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
                    </Button>
                </div>
            </form>
        </Form>
    )
}

type ContentProps = {
    itemYield: ItemYield
    open: boolean
    onOpenChange: (next: boolean) => void
}

function EditItemYieldDialogContent({
    itemYield,
    open,
    onOpenChange,
}: ContentProps) {
    const [lines, setLines] = useState<ItemYieldLineInput[]>([])
    const { activeProject } = useProject()
    const { accessToken, studioSlug } = useAuth()
    const queryClient = useQueryClient()
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            workCategoryId: '',
            name: '',
            description: '',
            measureUnitId: '',
            basisOutputQty: 1,
        },
    })

    useDialogDefaults(open, itemYield, form, setLines)

    const catalogQueriesEnabled = isCatalogQueriesEnabled(
        open,
        accessToken,
        studioSlug
    )
    const { data: categories = [], isPending: categoriesLoading } = useQuery({
        queryKey: qk.workCategories,
        queryFn: () => getWorkCategories({ token: accessToken, studioSlug }),
        enabled: catalogQueriesEnabled,
    })
    const { data: measureUnits = [], isPending: measureUnitsLoading } =
        useQuery({
            queryKey: qk.measureUnits,
            queryFn: () => getMeasureUnits({ token: accessToken, studioSlug }),
            enabled: catalogQueriesEnabled,
        })
    const { data: resources = [] } = useQuery({
        queryKey: qk.resources,
        queryFn: () => getResources({ token: accessToken, studioSlug }),
        enabled: catalogQueriesEnabled,
    })
    const catalog: CatalogData = {
        categories,
        categoriesLoading,
        measureUnits,
        measureUnitsLoading,
    }

    const canSubmit = canSubmitEditItemYieldForm({
        categoriesLoading,
        measureUnitsLoading,
        categoriesLen: categories.length,
        measureUnitsLen: measureUnits.length,
        isSubmitting: form.formState.isSubmitting,
    })

    const handleClose = useCallback(() => {
        onOpenChange(false)
    }, [onOpenChange])

    const onSubmit = async (values: FormValues) => {
        try {
            const updated = await patchProjectItemYield(
                activeProject.id,
                itemYield.id,
                {
                    workCategoryId: values.workCategoryId,
                    name: values.name,
                    description:
                        values.description.trim() === ''
                            ? undefined
                            : values.description.trim(),
                    measureUnitMode: 'OVERRIDE',
                    measureUnitId: values.measureUnitId,
                    basisOutputQty: values.basisOutputQty,
                    components: {
                        linkedItems: itemYield.linkedItems,
                        lines: lines.map(normalizeLineForSubmit),
                    },
                },
                { token: accessToken, studioSlug }
            )
            await queryClient.invalidateQueries({
                queryKey: qk.itemYields(activeProject.id),
            })
            toast.success('Rendimiento actualizado', {
                description: updated.name,
            })
            handleClose()
        } catch (error) {
            toast.error('No se pudo guardar el rendimiento', {
                description: getApiErrorMessage(error),
            })
        }
    }

    return (
        <Dialog open={open} onClose={handleClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
                <DialogPanel className="flex max-h-[min(90vh,100dvh)] w-full max-w-5xl flex-col rounded-lg border bg-background shadow-lg">
                    <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                        <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
                            Editar rendimiento
                        </DialogTitle>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Cerrar"
                            onClick={handleClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
                        <EditItemYieldForm
                            form={form}
                            onSubmit={onSubmit}
                            canSubmit={canSubmit}
                            lines={lines}
                            setLines={setLines}
                            resources={resources}
                            catalog={catalog}
                        />
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    )
}

export default function EditItemYieldDialog({
    itemYield,
    open,
    onOpenChange,
}: Props) {
    if (!itemYield) {
        return null
    }
    return (
        <EditItemYieldDialogContent
            itemYield={itemYield}
            open={open}
            onOpenChange={onOpenChange}
        />
    )
}
