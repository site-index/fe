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
    useMemo,
    useState,
} from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getProjectBudgetLines } from '@/api/budget-lines.api'
import { getStudioCatalogItems } from '@/api/catalog.api'
import {
    type CreateItemYieldInput,
    createProjectItemYield,
    getProjectItemYields,
    type ItemYieldLineInput,
} from '@/api/item-yields.api'
import {
    getResourcePrices,
    getResources,
    type ResourceRow,
    setResourcePrice,
} from '@/api/resources.api'
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
import {
    filterCatalogItemsLoadedInProject,
    loadedCatalogItemIdsFromProjectBudget,
} from '@/lib/project-loaded-catalog-items'
import { qk } from '@/lib/query-keys'

const schema = z.object({
    catalogItemId: z
        .string()
        .min(1, 'Elegí un ítem')
        .uuid('Elegí un ítem válido'),
})

type FormValues = z.infer<typeof schema>

interface CreateItemYieldDialogProps {
    trigger?: ReactNode
    onCreated?: (id: string) => void
}

function useItemYieldDialogDefaults(
    open: boolean,
    catalogItemsLoading: boolean,
    catalogItems: Awaited<ReturnType<typeof getStudioCatalogItems>>,
    form: UseFormReturn<FormValues>
): void {
    useEffect(() => {
        if (!open || catalogItemsLoading || catalogItems.length === 0) {
            return
        }
        const current = form.getValues('catalogItemId')
        const exists = catalogItems.some((c) => c.catalogItemId === current)
        if (exists) {
            return
        }
        form.setValue('catalogItemId', catalogItems[0].catalogItemId)
    }, [open, catalogItemsLoading, catalogItems, form])
}

function useCreateItemYieldSubmit(
    accessToken: string | null,
    studioSlug: string,
    projectId: string,
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
                    catalogItemId: values.catalogItemId,
                    components: {
                        linkedItems: [],
                        lines,
                    },
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
                    catalogItemId: '',
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
    catalogItemsLoading: boolean,
    catalogItemsLen: number,
    isSubmitting: boolean
): boolean {
    return !catalogItemsLoading && catalogItemsLen > 0 && !isSubmitting
}

function CreateItemYieldFormFields({
    form,
    onSubmit,
    catalogItems,
    catalogItemsLoading,
    resources,
    pricesByResourceId,
    onSetResourcePrice,
    lines,
    setLines,
    canSubmit,
}: {
    form: UseFormReturn<FormValues>
    onSubmit: (values: FormValues) => Promise<void>
    catalogItems: Awaited<ReturnType<typeof getStudioCatalogItems>>
    catalogItemsLoading: boolean
    resources: ResourceRow[]
    pricesByResourceId: Map<string, number>
    onSetResourcePrice: (resourceId: string, unitPrice: number) => Promise<void>
    lines: ItemYieldLineInput[]
    setLines: (next: ItemYieldLineInput[]) => void
    canSubmit: boolean
}) {
    const itemPlaceholder = catalogItemsLoading
        ? 'Cargando ítems…'
        : catalogItems.length === 0
          ? 'No hay ítems cargados en el proyecto'
          : 'Elegí un ítem'
    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex min-h-0 flex-1 flex-col"
            >
                <div className="flex-1 space-y-4 overflow-y-auto">
                    <FormField
                        control={form.control}
                        name="catalogItemId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ítem</FormLabel>
                                <Select
                                    disabled={
                                        catalogItemsLoading ||
                                        catalogItems.length === 0
                                    }
                                    onValueChange={field.onChange}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger aria-label="Ítem">
                                            <SelectValue
                                                placeholder={itemPlaceholder}
                                            />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {catalogItems.map((item) => (
                                            <SelectItem
                                                key={item.catalogItemId}
                                                value={item.catalogItemId}
                                            >
                                                {item.workCategoryName} ·{' '}
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!catalogItemsLoading &&
                                catalogItems.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        No hay ítems cargados en las líneas de
                                        este proyecto para crear un rendimiento.
                                    </p>
                                ) : null}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <ItemYieldLinesEditor
                        lines={lines}
                        resources={resources}
                        pricesByResourceId={pricesByResourceId}
                        disabled={form.formState.isSubmitting}
                        onSetResourcePrice={onSetResourcePrice}
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
            catalogItemId: '',
        },
    })

    const catalogQueriesEnabled =
        open && Boolean(accessToken && studioSlug.trim())
    const projectScopedQueriesEnabled =
        catalogQueriesEnabled && activeProject.id !== '__empty__'

    const { data: catalogItems = [], isPending: catalogItemsLoading } =
        useQuery({
            queryKey: qk.studioCatalogItems,
            queryFn: () =>
                getStudioCatalogItems({
                    token: accessToken,
                    studioSlug,
                }),
            enabled: catalogQueriesEnabled,
        })
    const { data: budgetLines = [] } = useQuery({
        queryKey: qk.budgetLines(activeProject.id),
        queryFn: () =>
            getProjectBudgetLines(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: projectScopedQueriesEnabled,
    })
    const { data: itemYields = [] } = useQuery({
        queryKey: qk.itemYields(activeProject.id),
        queryFn: () =>
            getProjectItemYields(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: projectScopedQueriesEnabled,
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
    const { data: resourcePrices = [] } = useQuery({
        queryKey: qk.resourcePrices,
        queryFn: () =>
            getResourcePrices({
                token: accessToken,
                studioSlug,
            }),
        enabled: catalogQueriesEnabled,
    })
    const pricesByResourceId = new Map(
        resourcePrices.map((row) => [row.resourceId, row.unitPrice] as const)
    )
    const loadedCatalogItemIds = useMemo(
        () =>
            loadedCatalogItemIdsFromProjectBudget({
                budgetLines,
                itemYields,
            }),
        [budgetLines, itemYields]
    )
    const projectCatalogItems = useMemo(
        () =>
            filterCatalogItemsLoadedInProject(
                catalogItems,
                loadedCatalogItemIds
            ),
        [catalogItems, loadedCatalogItemIds]
    )

    useItemYieldDialogDefaults(
        open,
        catalogItemsLoading,
        projectCatalogItems,
        form
    )

    const onSubmit = useCreateItemYieldSubmit(
        accessToken,
        studioSlug,
        activeProject.id,
        lines,
        form,
        queryClient,
        onCreated,
        setOpen,
        setLines
    )

    const resetValues = useCallback(() => {
        form.reset({
            catalogItemId: '',
        })
        setLines([])
    }, [form])

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
        catalogItemsLoading,
        projectCatalogItems.length,
        form.formState.isSubmitting
    )
    const onSetResourcePrice = useCallback(
        async (resourceId: string, unitPrice: number) => {
            const resource = resources.find((row) => row.id === resourceId)
            if (!resource) {
                return
            }
            await setResourcePrice(
                resourceId,
                {
                    measureUnitId: resource.commercialMeasureUnit.id,
                    unitPrice,
                },
                {
                    token: accessToken,
                    studioSlug,
                }
            )
            await queryClient.invalidateQueries({ queryKey: qk.resourcePrices })
        },
        [accessToken, queryClient, resources, studioSlug]
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
                                catalogItems={projectCatalogItems}
                                catalogItemsLoading={catalogItemsLoading}
                                resources={resources}
                                pricesByResourceId={pricesByResourceId}
                                onSetResourcePrice={onSetResourcePrice}
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
