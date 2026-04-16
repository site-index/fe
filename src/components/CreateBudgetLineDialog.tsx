import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    type KeyboardEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { useForm, type UseFormReturn, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
    type CreateBudgetLineInput,
    createProjectBudgetLine,
    getProjectBudgetLines,
} from '@/api/budget-lines.api'
import { getMeasureUnits, getWorkCategories } from '@/api/catalog.api'
import type { ItemYieldLineInput } from '@/api/item-yields.api'
import {
    getResourcePrices,
    getResources,
    setResourcePrice,
} from '@/api/resources.api'
import BudgetLineDialogShell from '@/components/BudgetLineDialogShell'
import {
    appendOptionalBudgetNumericFields,
    appendOptionalYieldComponents,
    buildBudgetLineCreateBody,
    DESCRIPTION_MAX_LENGTH,
    ensureManualWorkCategoryForSubmit,
    filterUnusedSuggestions,
    handleDescriptionSuggestionKey,
    type LibraryBinding,
    MIN_DESCRIPTION_LENGTH,
    NO_ACTIVE_SUGGESTION_INDEX,
    onDescriptionInputChange,
    openSuggestionsWhenFreeLine,
    renderCreateBudgetLineTrigger,
    resetDialogForm,
    shouldShowSuggestionPanel,
    SUGGESTION_CLOSE_DELAY_MS,
    SUGGESTION_LISTBOX_ID,
    toLibraryBindingFromSuggestion,
    UNIT_NONE,
    WORK_CATEGORY_NONE,
    workCategoryFromSuggestion,
} from '@/components/create-budget-line-dialog.helpers'
import type { BudgetLineCreateFormValues } from '@/components/create-budget-line-dialog-form-fields'
import { CreateBudgetLineDialogFormFields } from '@/components/create-budget-line-dialog-form-fields'
import ItemYieldLinesEditor from '@/components/ItemYieldLinesEditor'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import type { SuggestionRow } from '@/components/use-budget-line-description-suggestions'
import { useBudgetLineDescriptionSuggestions } from '@/components/use-budget-line-description-suggestions'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { getApiErrorMessage } from '@/lib/api'
import {
    breakdownSumFromStrings,
    isBreakdownActiveFromStrings,
    optionalNonNegStr,
} from '@/lib/form-utils'
import { qk } from '@/lib/query-keys'
import {
    RESOURCE_KIND_EQUIPMENT,
    RESOURCE_KIND_LABOR,
    RESOURCE_KIND_MATERIAL,
} from '@/types/resource-kind'
import type { WorkCategoryRow } from '@/types/work-category'

const schema = z.object({
    description: z
        .string()
        .trim()
        .min(MIN_DESCRIPTION_LENGTH, 'La descripción es obligatoria')
        .max(
            DESCRIPTION_MAX_LENGTH,
            `Máximo ${DESCRIPTION_MAX_LENGTH} caracteres`
        ),
    workCategoryId: z.union([z.literal(WORK_CATEGORY_NONE), z.string().uuid()]),
    measureUnitId: z.union([z.literal(UNIT_NONE), z.string().uuid()]),
    quantityStr: optionalNonNegStr,
    unitPriceStr: optionalNonNegStr,
    amountMaterialStr: optionalNonNegStr,
    amountLaborStr: optionalNonNegStr,
    amountEquipmentStr: optionalNonNegStr,
})

type FormValues = z.infer<typeof schema>
const ZERO_VALUE = 0
const EMPTY_RESOURCE_ROWS: Awaited<ReturnType<typeof getResources>> = []
const EMPTY_RESOURCE_PRICE_ROWS: Awaited<ReturnType<typeof getResourcePrices>> =
    []

function deriveAmounts(args: {
    lines: ItemYieldLineInput[]
    pricesByResourceId: Map<string, number>
    resourcesById: Map<string, { kind: string }>
}): { material: number; labor: number; equipment: number } {
    const totals = {
        material: ZERO_VALUE,
        labor: ZERO_VALUE,
        equipment: ZERO_VALUE,
    }
    for (const line of args.lines) {
        const resource = args.resourcesById.get(line.resourceId)
        if (!resource) continue
        const lineCost =
            Math.max(ZERO_VALUE, line.quantity) *
            (args.pricesByResourceId.get(line.resourceId) ?? ZERO_VALUE)
        if (resource.kind === RESOURCE_KIND_MATERIAL)
            totals.material += lineCost
        if (resource.kind === RESOURCE_KIND_LABOR) totals.labor += lineCost
        if (resource.kind === RESOURCE_KIND_EQUIPMENT)
            totals.equipment += lineCost
    }
    return totals
}

function useCreateBudgetLineSubmit(args: {
    libraryBinding: LibraryBinding
    categories: WorkCategoryRow[]
    form: UseFormReturn<FormValues>
    isBreakdownActive: boolean
    queryClient: ReturnType<typeof useQueryClient>
    activeProjectId: string
    accessToken: string | null
    studioSlug: string | null
    defaultForm: FormValues
    includeYieldSetup: boolean
    yieldLines: ItemYieldLineInput[]
    setLibraryBinding: (value: LibraryBinding) => void
    setOpen: (open: boolean) => void
    resetYieldSetup: () => void
}) {
    return async (submitted: FormValues) => {
        const withRequiredCategory = ensureManualWorkCategoryForSubmit({
            submitted,
            libraryBinding: args.libraryBinding,
            categories: args.categories,
            workCategoryNoneValue: WORK_CATEGORY_NONE,
            setWorkCategory: (value) =>
                args.form.setValue('workCategoryId', value, {
                    shouldValidate: true,
                }),
        })
        if (!withRequiredCategory) {
            args.form.setError('workCategoryId', {
                type: 'manual',
                message:
                    'No hay rubros disponibles para crear este ítem. Revisá la configuración del estudio.',
            })
            return
        }
        const normalizedSubmitted = args.isBreakdownActive
            ? {
                  ...withRequiredCategory,
                  unitPriceStr: String(
                      breakdownSumFromStrings(withRequiredCategory)
                  ),
              }
            : withRequiredCategory
        const baseBody = buildBudgetLineCreateBody(
            normalizedSubmitted,
            args.libraryBinding,
            WORK_CATEGORY_NONE
        )
        appendOptionalBudgetNumericFields(
            baseBody,
            normalizedSubmitted,
            UNIT_NONE
        )
        appendOptionalYieldComponents({
            body: baseBody,
            includeYieldSetup: args.includeYieldSetup,
            yieldLines: args.yieldLines,
        })
        try {
            const created = await createProjectBudgetLine(
                args.activeProjectId,
                baseBody as unknown as CreateBudgetLineInput,
                { token: args.accessToken, studioSlug: args.studioSlug }
            )
            void Promise.allSettled([
                args.queryClient.invalidateQueries({
                    queryKey: qk.budgetLines(
                        args.studioSlug,
                        args.activeProjectId
                    ),
                }),
                args.queryClient.invalidateQueries({
                    queryKey: qk.itemYields(
                        args.studioSlug,
                        args.activeProjectId
                    ),
                }),
                args.queryClient.invalidateQueries({
                    queryKey: qk.dashboard(
                        args.studioSlug,
                        args.activeProjectId
                    ),
                }),
            ])
            toast.success('Línea de presupuesto creada', {
                description: created.description,
            })
            args.form.reset(args.defaultForm)
            args.setLibraryBinding(null)
            args.resetYieldSetup()
            args.setOpen(false)
        } catch (err) {
            toast.error('No se pudo crear la línea', {
                description: getApiErrorMessage(err),
            })
        }
    }
}

function useDefaultWorkCategorySync(args: {
    open: boolean
    defaultWorkCategoryId: string | null
    form: UseFormReturn<FormValues>
    libraryBinding: LibraryBinding
    categories: WorkCategoryRow[]
}): void {
    useEffect(() => {
        if (!args.open) {
            return
        }
        if (args.defaultWorkCategoryId) {
            args.form.setValue('workCategoryId', args.defaultWorkCategoryId, {
                shouldValidate: true,
            })
            return
        }
        if (args.libraryBinding != null) {
            return
        }
        const current = args.form.getValues('workCategoryId')
        if (current !== WORK_CATEGORY_NONE) {
            return
        }
        const fallback = args.categories[0]?.id
        if (!fallback) {
            return
        }
        args.form.setValue('workCategoryId', fallback, {
            shouldValidate: true,
        })
    }, [
        args.categories,
        args.defaultWorkCategoryId,
        args.form,
        args.libraryBinding,
        args.open,
    ])
}

function useLibraryMeasureUnitSync(args: {
    form: UseFormReturn<FormValues>
    libraryBinding: LibraryBinding
}): void {
    useEffect(() => {
        if (args.libraryBinding?.measureUnitId != null) {
            args.form.setValue(
                'measureUnitId',
                args.libraryBinding.measureUnitId,
                {
                    shouldValidate: true,
                }
            )
            return
        }
        if (args.libraryBinding != null) {
            args.form.setValue('measureUnitId', UNIT_NONE, {
                shouldValidate: true,
            })
        }
    }, [args.form, args.libraryBinding])
}

function useBreakdownUnitPriceSync(args: {
    open: boolean
    isBreakdownActive: boolean
    pricingLockedByYield: boolean
    breakdownSum: number
    unitPriceStr: string
    form: UseFormReturn<FormValues>
}): void {
    useEffect(() => {
        if (
            !args.open ||
            !args.isBreakdownActive ||
            args.pricingLockedByYield
        ) {
            return
        }
        const nextUnitPrice = String(args.breakdownSum)
        if (args.unitPriceStr === nextUnitPrice) {
            return
        }
        args.form.setValue('unitPriceStr', nextUnitPrice, {
            shouldValidate: true,
        })
    }, [
        args.breakdownSum,
        args.form,
        args.isBreakdownActive,
        args.open,
        args.pricingLockedByYield,
        args.unitPriceStr,
    ])
}

function useYieldPricingSync(args: {
    pricingLockedByYield: boolean
    lines: ItemYieldLineInput[]
    pricesByResourceId: Map<string, number>
    resourcesById: Map<string, { kind: string }>
    form: UseFormReturn<FormValues>
}): void {
    useEffect(() => {
        if (!args.pricingLockedByYield) {
            return
        }
        const perUnit = deriveAmounts({
            lines: args.lines,
            pricesByResourceId: args.pricesByResourceId,
            resourcesById: args.resourcesById,
        })
        const unitPrice = perUnit.material + perUnit.labor + perUnit.equipment
        const next = {
            unitPriceStr: String(unitPrice),
            amountMaterialStr: String(perUnit.material),
            amountLaborStr: String(perUnit.labor),
            amountEquipmentStr: String(perUnit.equipment),
        }
        const current = {
            unitPriceStr: args.form.getValues('unitPriceStr'),
            amountMaterialStr: args.form.getValues('amountMaterialStr'),
            amountLaborStr: args.form.getValues('amountLaborStr'),
            amountEquipmentStr: args.form.getValues('amountEquipmentStr'),
        }
        const willChange =
            current.unitPriceStr !== next.unitPriceStr ||
            current.amountMaterialStr !== next.amountMaterialStr ||
            current.amountLaborStr !== next.amountLaborStr ||
            current.amountEquipmentStr !== next.amountEquipmentStr
        if (!willChange) {
            return
        }
        args.form.setValue('unitPriceStr', String(unitPrice), {
            shouldValidate: true,
        })
        args.form.setValue('amountMaterialStr', String(perUnit.material), {
            shouldValidate: true,
        })
        args.form.setValue('amountLaborStr', String(perUnit.labor), {
            shouldValidate: true,
        })
        args.form.setValue('amountEquipmentStr', String(perUnit.equipment), {
            shouldValidate: true,
        })
    }, [
        args.form,
        args.lines,
        args.pricesByResourceId,
        args.pricingLockedByYield,
        args.resourcesById,
    ])
}

function applySuggestionSelection(args: {
    row: SuggestionRow
    form: UseFormReturn<FormValues>
    setLibraryBinding: (value: LibraryBinding) => void
    resetYieldSetup: () => void
    setSuggestionsOpen: (value: boolean) => void
    setActiveSuggestionIndex: (value: number) => void
}): void {
    const measureUnitId = args.row.measureUnitId ?? UNIT_NONE
    args.form.setValue('description', args.row.name, { shouldValidate: true })
    args.form.setValue('workCategoryId', workCategoryFromSuggestion(args.row), {
        shouldValidate: true,
    })
    args.form.setValue('measureUnitId', measureUnitId, {
        shouldValidate: true,
    })
    args.setLibraryBinding(toLibraryBindingFromSuggestion(args.row))
    if (args.row.kind === 'yield') {
        args.resetYieldSetup()
    }
    args.setSuggestionsOpen(false)
    args.setActiveSuggestionIndex(NO_ACTIVE_SUGGESTION_INDEX)
}

function useResourcePriceUpdater(args: {
    resources: Awaited<ReturnType<typeof getResources>>
    accessToken: string | null
    studioSlug: string | null
    queryClient: ReturnType<typeof useQueryClient>
}) {
    return useCallback(
        async (resourceId: string, unitPrice: number) => {
            const resource = args.resources.find((row) => row.id === resourceId)
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
                    token: args.accessToken,
                    studioSlug: args.studioSlug,
                }
            )
            await args.queryClient.invalidateQueries({
                queryKey: qk.resourcePrices(args.studioSlug),
            })
        },
        [args.accessToken, args.queryClient, args.resources, args.studioSlug]
    )
}

function resolveDefaultWorkCategoryId(
    defaultWorkCategoryId: string | null | undefined
): string {
    return defaultWorkCategoryId ?? WORK_CATEGORY_NONE
}

function getDialogQueryFlags(args: {
    open: boolean
    isQueryReady: boolean
    libraryBinding: LibraryBinding
    includeYieldSetup: boolean
}) {
    const isOpenAndQueryReady = args.open && args.isQueryReady
    const canConfigureYieldSetup = args.libraryBinding?.kind !== 'yield'
    const includeYieldSetupEffective =
        canConfigureYieldSetup && args.includeYieldSetup
    const shouldLoadYieldData =
        isOpenAndQueryReady && includeYieldSetupEffective
    return {
        isOpenAndQueryReady,
        canConfigureYieldSetup,
        includeYieldSetupEffective,
        shouldLoadYieldData,
    }
}

interface CreateBudgetLineDialogProps {
    trigger?: ReactNode
    defaultWorkCategoryId?: string | null
}

type CreateBudgetLineDialogViewProps = {
    trigger?: ReactNode
    open: boolean
    setOpen: (open: boolean) => void
    resetDialog: () => void
    resetYieldSetup: () => void
    form: UseFormReturn<FormValues>
    onSubmit: (submitted: FormValues) => Promise<void>
    values: BudgetLineCreateFormValues
    libraryBinding: LibraryBinding
    categories: WorkCategoryRow[]
    categoriesLoading: boolean
    measureUnits: Awaited<ReturnType<typeof getMeasureUnits>>
    measureUnitsLoading: boolean
    showSuggestions: boolean
    suggestionsLoading: boolean
    filteredSuggestionRows: SuggestionRow[]
    activeSuggestionIndex: number
    setActiveSuggestionIndex: (value: number) => void
    onDescriptionKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
    onDescriptionFocus: () => void
    onDescriptionBlur: () => void
    onDescriptionInput: () => void
    clearLibraryBinding: () => void
    handleSuggestionPick: (row: SuggestionRow) => void
    isBreakdownActive: boolean
    pricingLockedByYield: boolean
    hideWorkCategoryField: boolean
    canConfigureYieldSetup: boolean
    setIncludeYieldSetup: (value: (prev: boolean) => boolean) => void
    yieldLines: ItemYieldLineInput[]
    resources: Awaited<ReturnType<typeof getResources>>
    pricesByResourceId: Map<string, number>
    onSetResourcePrice: (resourceId: string, unitPrice: number) => Promise<void>
    setYieldLines: (value: ItemYieldLineInput[]) => void
}

function CreateBudgetLineDialogView(props: CreateBudgetLineDialogViewProps) {
    return (
        <>
            {renderCreateBudgetLineTrigger({
                trigger: props.trigger,
                onOpen: () => props.setOpen(true),
            })}
            <BudgetLineDialogShell
                open={props.open}
                onClose={() => {
                    props.setOpen(false)
                    props.resetDialog()
                    props.resetYieldSetup()
                }}
                title="Nuevo ítem de presupuesto"
                onSubmit={props.form.handleSubmit(props.onSubmit)}
                submitLabel="Crear"
                submittingLabel="Creando…"
                isSubmitting={props.form.formState.isSubmitting}
            >
                <CreateBudgetLineDialogFormFields
                    form={
                        props.form as UseFormReturn<BudgetLineCreateFormValues>
                    }
                    values={props.values}
                    libraryBinding={props.libraryBinding}
                    categories={props.categories}
                    categoriesLoading={props.categoriesLoading}
                    measureUnits={props.measureUnits}
                    measureUnitsLoading={props.measureUnitsLoading}
                    workCategoryNoneValue={WORK_CATEGORY_NONE}
                    unitNone={UNIT_NONE}
                    showSuggestions={props.showSuggestions}
                    suggestionsLoading={props.suggestionsLoading}
                    filteredSuggestionRows={props.filteredSuggestionRows}
                    suggestionListboxId={SUGGESTION_LISTBOX_ID}
                    activeSuggestionIndex={props.activeSuggestionIndex}
                    setActiveSuggestionIndex={props.setActiveSuggestionIndex}
                    onDescriptionKeyDown={props.onDescriptionKeyDown}
                    onDescriptionFocus={props.onDescriptionFocus}
                    onDescriptionBlur={props.onDescriptionBlur}
                    onDescriptionInput={props.onDescriptionInput}
                    onClearLibraryBinding={props.clearLibraryBinding}
                    handleSuggestionPick={props.handleSuggestionPick}
                    isBreakdownActive={props.isBreakdownActive}
                    pricingLockedByYield={props.pricingLockedByYield}
                    hideWorkCategoryField={props.hideWorkCategoryField}
                    bottomSection={
                        <div className="space-y-2">
                            <Accordion
                                type="single"
                                collapsible
                                className="w-full"
                            >
                                <AccordionItem
                                    value="yieldSetup"
                                    className="border-b-0 border-t"
                                >
                                    <AccordionTrigger
                                        className={
                                            !props.canConfigureYieldSetup
                                                ? 'pointer-events-none py-2 text-sm opacity-50'
                                                : 'py-2 text-sm'
                                        }
                                        aria-disabled={
                                            !props.canConfigureYieldSetup
                                        }
                                        onClick={() =>
                                            props.setIncludeYieldSetup(
                                                (prev) => !prev
                                            )
                                        }
                                    >
                                        Rendimiento (opcional)
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 pt-1">
                                        <p className="text-xs text-muted-foreground">
                                            Definí líneas de recursos al crear.
                                        </p>
                                        <ItemYieldLinesEditor
                                            lines={props.yieldLines}
                                            resources={props.resources}
                                            pricesByResourceId={
                                                props.pricesByResourceId
                                            }
                                            disabled={
                                                props.form.formState
                                                    .isSubmitting
                                            }
                                            flat
                                            onSetResourcePrice={
                                                props.onSetResourcePrice
                                            }
                                            onChange={props.setYieldLines}
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            {!props.canConfigureYieldSetup ? (
                                <p className="text-xs text-muted-foreground">
                                    Al vincular un rendimiento existente, se usa
                                    su configuración actual.
                                </p>
                            ) : null}
                        </div>
                    }
                />
            </BudgetLineDialogShell>
        </>
    )
}

export default function CreateBudgetLineDialog({
    trigger,
    defaultWorkCategoryId = null,
}: CreateBudgetLineDialogProps) {
    const [open, setOpen] = useState(false)
    const [libraryBinding, setLibraryBinding] = useState<LibraryBinding>(null)
    const [suggestionsOpen, setSuggestionsOpen] = useState(false)
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(
        NO_ACTIVE_SUGGESTION_INDEX
    )
    const [includeYieldSetup, setIncludeYieldSetup] = useState(false)
    const [yieldLines, setYieldLines] = useState<ItemYieldLineInput[]>([])
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const { activeProject } = useProject()
    const queryClient = useQueryClient()
    const resolvedDefaultWorkCategoryId = resolveDefaultWorkCategoryId(
        defaultWorkCategoryId
    )
    const hideWorkCategoryField = defaultWorkCategoryId != null
    const {
        isOpenAndQueryReady,
        canConfigureYieldSetup,
        includeYieldSetupEffective,
        shouldLoadYieldData,
    } = getDialogQueryFlags({
        open,
        isQueryReady,
        libraryBinding,
        includeYieldSetup,
    })

    const defaultForm: FormValues = {
        description: '',
        workCategoryId: resolvedDefaultWorkCategoryId,
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
    const values = useWatch({
        control: form.control,
        defaultValue: defaultForm,
    }) as BudgetLineCreateFormValues
    const breakdownSum = breakdownSumFromStrings(values)
    const isBreakdownActive = isBreakdownActiveFromStrings(values)

    const { data: categories = [], isPending: categoriesLoading } = useQuery({
        queryKey: qk.workCategories(studioSlug),
        queryFn: () =>
            getWorkCategories({
                token: accessToken,
                studioSlug,
            }),
        enabled: isOpenAndQueryReady,
    })

    const { data: measureUnits = [], isPending: measureUnitsLoading } =
        useQuery({
            queryKey: qk.measureUnits(studioSlug),
            queryFn: () =>
                getMeasureUnits({
                    token: accessToken,
                    studioSlug,
                }),
            enabled: isOpenAndQueryReady,
        })
    const { data: resources = EMPTY_RESOURCE_ROWS } = useQuery({
        queryKey: qk.resources(studioSlug),
        queryFn: () =>
            getResources({
                token: accessToken,
                studioSlug,
            }),
        enabled: shouldLoadYieldData,
    })
    const { data: resourcePrices = EMPTY_RESOURCE_PRICE_ROWS } = useQuery({
        queryKey: qk.resourcePrices(studioSlug),
        queryFn: () =>
            getResourcePrices({
                token: accessToken,
                studioSlug,
            }),
        enabled: shouldLoadYieldData,
    })
    const pricesByResourceId = useMemo(
        () =>
            new Map(
                resourcePrices.map(
                    (row) => [row.resourceId, row.unitPrice] as const
                )
            ),
        [resourcePrices]
    )
    const resourcesById = useMemo(
        () =>
            new Map(
                resources.map(
                    (resource) =>
                        [resource.id, { kind: resource.kind }] as const
                )
            ),
        [resources]
    )
    const pricingLockedByYield = includeYieldSetupEffective

    const { data: existingBudgetLines = [] } = useQuery({
        queryKey: qk.budgetLines(studioSlug, activeProject.id),
        queryFn: () =>
            getProjectBudgetLines(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: isOpenAndQueryReady,
    })

    const {
        fuse,
        suggestionRows,
        suggestionsLoading,
        queryEnabled,
        hasCorpus,
    } = useBudgetLineDescriptionSuggestions(
        open,
        activeProject.id,
        accessToken,
        studioSlug
    )

    const usedCatalogItemIds = useMemo(
        () =>
            new Set(
                existingBudgetLines
                    .map((line) => line.catalogItemId)
                    .filter((id): id is string => id != null)
            ),
        [existingBudgetLines]
    )
    const usedItemYieldIds = useMemo(
        () =>
            new Set(
                existingBudgetLines
                    .map((line) => line.itemYieldId)
                    .filter((id): id is string => id != null)
            ),
        [existingBudgetLines]
    )

    const filteredSuggestionRows = useMemo(
        () =>
            filterUnusedSuggestions({
                fuse,
                suggestionRows,
                description: values.description,
                workCategoryId: values.workCategoryId,
                usedCatalogItemIds,
                usedItemYieldIds,
            }),
        [
            fuse,
            suggestionRows,
            values.description,
            values.workCategoryId,
            usedCatalogItemIds,
            usedItemYieldIds,
        ]
    )

    const showSuggestions = shouldShowSuggestionPanel({
        open,
        libraryBinding,
        suggestionsOpen,
        queryEnabled,
        suggestionsLoading,
        hasCorpus,
    })

    useDefaultWorkCategorySync({
        open,
        defaultWorkCategoryId,
        form,
        libraryBinding,
        categories,
    })
    useLibraryMeasureUnitSync({ form, libraryBinding })
    useBreakdownUnitPriceSync({
        open,
        isBreakdownActive,
        pricingLockedByYield,
        breakdownSum,
        unitPriceStr: values.unitPriceStr,
        form,
    })
    useYieldPricingSync({
        pricingLockedByYield,
        lines: yieldLines,
        pricesByResourceId,
        resourcesById,
        form,
    })

    const resetYieldSetup = useCallback(() => {
        setIncludeYieldSetup(false)
        setYieldLines([])
    }, [])

    const handleSuggestionPick = (row: SuggestionRow) => {
        applySuggestionSelection({
            row,
            form,
            setLibraryBinding,
            resetYieldSetup,
            setSuggestionsOpen,
            setActiveSuggestionIndex,
        })
    }

    const clearLibraryBinding = () => {
        setLibraryBinding(null)
        form.setValue('measureUnitId', UNIT_NONE, { shouldValidate: true })
        form.setValue('workCategoryId', resolvedDefaultWorkCategoryId, {
            shouldValidate: true,
        })
    }

    const onSetResourcePrice = useResourcePriceUpdater({
        resources,
        accessToken,
        studioSlug,
        queryClient,
    })

    const onDescriptionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        handleDescriptionSuggestionKey({
            event,
            showSuggestions,
            rows: filteredSuggestionRows,
            activeSuggestionIndex,
            setSuggestionsOpen,
            setActiveSuggestionIndex,
            onPick: handleSuggestionPick,
        })
    }

    const onSubmit = useCreateBudgetLineSubmit({
        libraryBinding,
        categories,
        form,
        isBreakdownActive,
        queryClient,
        activeProjectId: activeProject.id,
        accessToken,
        studioSlug,
        defaultForm,
        includeYieldSetup: includeYieldSetupEffective,
        yieldLines,
        setLibraryBinding,
        setOpen,
        resetYieldSetup,
    })

    const resetDialog = () =>
        resetDialogForm({
            form,
            defaultForm,
            defaultWorkCategoryId,
            setLibraryBinding,
            setSuggestionsOpen,
            setActiveSuggestionIndex,
        })

    const onDescriptionFocus = () => {
        openSuggestionsWhenFreeLine({
            libraryBinding,
            setSuggestionsOpen,
        })
    }
    const onDescriptionBlur = () => {
        window.setTimeout(() => {
            setSuggestionsOpen(false)
        }, SUGGESTION_CLOSE_DELAY_MS)
    }
    const onDescriptionInput = () => {
        onDescriptionInputChange({
            libraryBinding,
            setSuggestionsOpen,
            setActiveSuggestionIndex,
        })
    }

    return (
        <CreateBudgetLineDialogView
            trigger={trigger}
            open={open}
            setOpen={setOpen}
            resetDialog={resetDialog}
            resetYieldSetup={resetYieldSetup}
            form={form}
            onSubmit={onSubmit}
            values={values}
            libraryBinding={libraryBinding}
            categories={categories}
            categoriesLoading={categoriesLoading}
            measureUnits={measureUnits}
            measureUnitsLoading={measureUnitsLoading}
            showSuggestions={showSuggestions}
            suggestionsLoading={suggestionsLoading}
            filteredSuggestionRows={filteredSuggestionRows}
            activeSuggestionIndex={activeSuggestionIndex}
            setActiveSuggestionIndex={setActiveSuggestionIndex}
            onDescriptionKeyDown={onDescriptionKeyDown}
            onDescriptionFocus={onDescriptionFocus}
            onDescriptionBlur={onDescriptionBlur}
            onDescriptionInput={onDescriptionInput}
            clearLibraryBinding={clearLibraryBinding}
            handleSuggestionPick={handleSuggestionPick}
            isBreakdownActive={isBreakdownActive}
            pricingLockedByYield={pricingLockedByYield}
            hideWorkCategoryField={hideWorkCategoryField}
            canConfigureYieldSetup={canConfigureYieldSetup}
            setIncludeYieldSetup={setIncludeYieldSetup}
            yieldLines={yieldLines}
            resources={resources}
            pricesByResourceId={pricesByResourceId}
            onSetResourcePrice={onSetResourcePrice}
            setYieldLines={setYieldLines}
        />
    )
}
