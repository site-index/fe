import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import {
    cloneElement,
    isValidElement,
    type MouseEvent,
    type ReactElement,
    type ReactNode,
    useCallback,
    useEffect,
    useState,
} from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getMeasureUnits, getWorkCategories } from '@/api/catalog.api'
import {
    type CreateItemYieldInput,
    createProjectItemYield,
    type ItemYieldLineInput,
} from '@/api/item-yields.api'
import { getResources, type ResourceRow } from '@/api/resources.api'
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
import type { MeasureUnitRow } from '@/types/measure-unit'
import {
    OTHER_WORK_CATEGORY_CODE,
    type WorkCategoryRow,
} from '@/types/work-category'

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

interface CreateItemYieldDialogProps {
    trigger?: ReactNode
    onCreated?: (id: string) => void
}

function defaultMeasureUnitId(units: MeasureUnitRow[]): string {
    return units[0]?.id ?? ''
}

function useItemYieldDialogDefaults(
    open: boolean,
    categoriesLoading: boolean,
    categories: WorkCategoryRow[],
    form: UseFormReturn<FormValues>,
    measureUnitsLoading: boolean,
    measureUnits: MeasureUnitRow[]
): void {
    useEffect(() => {
        if (!open || categoriesLoading || categories.length === 0) {
            return
        }
        const current = form.getValues('workCategoryId')
        const exists = categories.some((c) => c.id === current)
        if (exists) {
            return
        }
        const other = categories.find(
            (c) => c.code === OTHER_WORK_CATEGORY_CODE
        )
        if (other) {
            form.setValue('workCategoryId', other.id)
            return
        }
        form.setValue('workCategoryId', categories[0].id)
    }, [open, categoriesLoading, categories, form])

    useEffect(() => {
        if (!open || measureUnitsLoading || measureUnits.length === 0) {
            return
        }
        const current = form.getValues('measureUnitId')
        if (current === '') {
            form.setValue('measureUnitId', defaultMeasureUnitId(measureUnits))
        }
    }, [open, measureUnitsLoading, measureUnits, form])
}

function useCreateItemYieldSubmit(
    accessToken: string | null,
    studioSlug: string,
    projectId: string,
    measureUnits: MeasureUnitRow[],
    lines: ItemYieldLineInput[],
    form: UseFormReturn<FormValues>,
    queryClient: ReturnType<typeof useQueryClient>,
    onCreated: ((id: string) => void) | undefined,
    setOpen: (v: boolean) => void,
    setLines: (next: ItemYieldLineInput[]) => void
) {
    return useCallback(
        async (values: FormValues) => {
            try {
                const body: CreateItemYieldInput = {
                    workCategoryId: values.workCategoryId,
                    name: values.name,
                    measureUnitId: values.measureUnitId,
                    basisOutputQty: values.basisOutputQty,
                    components: {
                        linkedItems: [],
                        lines,
                    },
                }
                if (values.description.trim() !== '') {
                    body.description = values.description.trim()
                }
                const created = await createProjectItemYield(projectId, body, {
                    token: accessToken,
                    studioSlug,
                })
                await queryClient.invalidateQueries({
                    queryKey: qk.itemYields(projectId),
                })
                toast.success('Rendimiento creado', {
                    description: created.name,
                })
                form.reset({
                    workCategoryId: '',
                    name: '',
                    description: '',
                    measureUnitId: defaultMeasureUnitId(measureUnits),
                    basisOutputQty: 1,
                })
                setOpen(false)
                setLines([])
                onCreated?.(created.id)
            } catch (err) {
                toast.error('Error al crear el rendimiento', {
                    description: getApiErrorMessage(err),
                })
            }
        },
        [
            accessToken,
            form,
            lines,
            measureUnits,
            onCreated,
            projectId,
            queryClient,
            setOpen,
            setLines,
            studioSlug,
        ]
    )
}

function itemYieldFormCanSubmit(
    categoriesLoading: boolean,
    measureUnitsLoading: boolean,
    categoriesLen: number,
    measureUnitsLen: number,
    isSubmitting: boolean
): boolean {
    return (
        !categoriesLoading &&
        !measureUnitsLoading &&
        categoriesLen > 0 &&
        measureUnitsLen > 0 &&
        !isSubmitting
    )
}

function CreateItemYieldFormFields({
    form,
    onSubmit,
    categories,
    categoriesLoading,
    categoriesError,
    measureUnits,
    measureUnitsLoading,
    resources,
    lines,
    setLines,
    canSubmit,
}: {
    form: UseFormReturn<FormValues>
    onSubmit: (values: FormValues) => Promise<void>
    categories: WorkCategoryRow[]
    categoriesLoading: boolean
    categoriesError: boolean
    measureUnits: MeasureUnitRow[]
    measureUnitsLoading: boolean
    resources: ResourceRow[]
    lines: ItemYieldLineInput[]
    setLines: (next: ItemYieldLineInput[]) => void
    canSubmit: boolean
}) {
    const workCategoryPlaceholder = categoriesLoading
        ? 'Cargando rubros…'
        : categories.length === 0
          ? 'No hay rubros disponibles'
          : 'Elegí un rubro'
    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex min-h-0 flex-1 flex-col"
            >
                <div className="flex-1 space-y-4 overflow-y-auto">
                    <FormField
                        control={form.control}
                        name="workCategoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rubro</FormLabel>
                                <Select
                                    disabled={
                                        categoriesLoading ||
                                        categories.length === 0
                                    }
                                    onValueChange={field.onChange}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger aria-label="Rubro">
                                            <SelectValue
                                                placeholder={
                                                    workCategoryPlaceholder
                                                }
                                            />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!categoriesLoading &&
                                categories.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        {categoriesError
                                            ? 'No pudimos cargar los rubros. Reintentá en unos segundos.'
                                            : 'No hay rubros disponibles para crear este rendimiento.'}
                                    </p>
                                ) : null}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
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
                                        onChange={(event) => {
                                            field.onChange(
                                                Number(event.target.value)
                                            )
                                        }}
                                    />
                                </FormControl>
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
                                    disabled={measureUnitsLoading}
                                    onValueChange={field.onChange}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger aria-label="Unidad de medida">
                                            <SelectValue placeholder="Cargando unidades…" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
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
                    <ItemYieldLinesEditor
                        lines={lines}
                        resources={resources}
                        measureUnits={measureUnits}
                        disabled={form.formState.isSubmitting}
                        onChange={setLines}
                    />
                </div>
                <div className="flex shrink-0 justify-end border-t px-0 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <Button type="submit" disabled={!canSubmit}>
                        {form.formState.isSubmitting ? 'Creando…' : 'Crear'}
                    </Button>
                </div>
            </form>
        </Form>
    )
}

export default function CreateItemYieldDialog({
    trigger,
    onCreated,
}: CreateItemYieldDialogProps) {
    const [open, setOpen] = useState(false)
    const [lines, setLines] = useState<ItemYieldLineInput[]>([])
    const { accessToken, studioSlug } = useAuth()
    const { activeProject } = useProject()
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

    const catalogQueriesEnabled =
        open && Boolean(accessToken && studioSlug.trim())

    const {
        data: categories = [],
        isPending: categoriesLoading,
        isError: categoriesError,
    } = useQuery({
        queryKey: qk.workCategories,
        queryFn: () =>
            getWorkCategories({
                token: accessToken,
                studioSlug,
            }),
        enabled: catalogQueriesEnabled,
    })

    const { data: measureUnits = [], isPending: measureUnitsLoading } =
        useQuery({
            queryKey: qk.measureUnits,
            queryFn: () =>
                getMeasureUnits({
                    token: accessToken,
                    studioSlug,
                }),
            enabled: catalogQueriesEnabled,
        })
    const { data: resources = [] } = useQuery({
        queryKey: qk.resources,
        queryFn: () =>
            getResources({
                token: accessToken,
                studioSlug,
            }),
        enabled: catalogQueriesEnabled,
    })

    useItemYieldDialogDefaults(
        open,
        categoriesLoading,
        categories,
        form,
        measureUnitsLoading,
        measureUnits
    )

    const onSubmit = useCreateItemYieldSubmit(
        accessToken,
        studioSlug,
        activeProject.id,
        measureUnits,
        lines,
        form,
        queryClient,
        onCreated,
        setOpen,
        setLines
    )

    const resetValues = useCallback(() => {
        form.reset({
            workCategoryId: '',
            name: '',
            description: '',
            measureUnitId: defaultMeasureUnitId(measureUnits),
            basisOutputQty: 1,
        })
        setLines([])
    }, [form, measureUnits])

    const handleOpenChange = useCallback(
        (v: boolean) => {
            setOpen(v)
            if (!v) {
                resetValues()
            }
        },
        [resetValues]
    )

    const canSubmit = itemYieldFormCanSubmit(
        categoriesLoading,
        measureUnitsLoading,
        categories.length,
        measureUnits.length,
        form.formState.isSubmitting
    )

    const renderTrigger = () => {
        if (!trigger) {
            return (
                <Button
                    type="button"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleOpenChange(true)}
                >
                    <Plus className="h-4 w-4" />
                    Nuevo rendimiento
                </Button>
            )
        }
        if (isValidElement(trigger)) {
            const el = trigger as ReactElement<{
                onClick?: (event: MouseEvent<HTMLElement>) => void
            }>
            return cloneElement(el, {
                onClick: (event: MouseEvent<HTMLElement>) => {
                    el.props.onClick?.(event)
                    if (!event.defaultPrevented) {
                        handleOpenChange(true)
                    }
                },
            })
        }
        return null
    }

    return (
        <>
            {renderTrigger()}
            <Dialog
                open={open}
                onClose={() => handleOpenChange(false)}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <DialogPanel className="flex max-h-[min(90vh,100dvh)] w-full max-w-md flex-col rounded-lg border bg-background shadow-lg">
                        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
                                Nuevo rendimiento
                            </DialogTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Cerrar"
                                onClick={() => handleOpenChange(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="shrink-0 border-b px-4 py-3 text-sm text-muted-foreground">
                            Elegí rubro y unidad del ítem, y cargá las líneas de
                            recursos que usa este rendimiento.
                        </p>
                        <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
                            <CreateItemYieldFormFields
                                form={form}
                                onSubmit={onSubmit}
                                categories={categories}
                                categoriesLoading={categoriesLoading}
                                categoriesError={categoriesError}
                                measureUnits={measureUnits}
                                measureUnitsLoading={measureUnitsLoading}
                                resources={resources}
                                lines={lines}
                                setLines={setLines}
                                canSubmit={canSubmit}
                            />
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
