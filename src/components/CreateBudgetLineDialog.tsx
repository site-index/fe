import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import {
    cloneElement,
    type Dispatch,
    isValidElement,
    type KeyboardEvent,
    type MouseEvent,
    type ReactElement,
    type ReactNode,
    type SetStateAction,
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
import BudgetLineDialogShell from '@/components/BudgetLineDialogShell'
import type { BudgetLineCreateFormValues } from '@/components/create-budget-line-dialog-form-fields'
import { CreateBudgetLineDialogFormFields } from '@/components/create-budget-line-dialog-form-fields'
import { Button } from '@/components/ui/button'
import {
    type SuggestionRow,
    useBudgetLineDescriptionSuggestions,
} from '@/components/use-budget-line-description-suggestions'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { getApiErrorMessage } from '@/lib/api'
import { filterBudgetLineSuggestionRows } from '@/lib/budget-line-suggestion-filter'
import {
    breakdownSumFromStrings,
    isBreakdownActiveFromStrings,
    optionalNonNegStr,
    toNum,
} from '@/lib/form-utils'
import { qk } from '@/lib/query-keys'
import type { WorkCategoryRow } from '@/types/work-category'

const WORK_CATEGORY_NONE = '__none__'
const UNIT_NONE = '__none__'
const SUGGESTION_LISTBOX_ID = 'create-budget-line-suggestion-listbox'
const DESCRIPTION_MAX_LENGTH = 2000
const SUGGESTION_CLOSE_DELAY_MS = 200
const MIN_DESCRIPTION_LENGTH = 1
const EMPTY_COLLECTION_LENGTH = 0
const FIRST_ITEM_INDEX = 0
const NO_ACTIVE_SUGGESTION_INDEX = -1
const SUGGESTION_INDEX_STEP = 1

type LibraryBinding =
    | null
    | {
          kind: 'yield'
          yieldId: string
          workCategoryName: string
          measureUnitId: string | null
          measureUnitName: string | null
      }
    | {
          kind: 'catalog'
          catalogItemId: string
          workCategoryId: string
          workCategoryName: string
          measureUnitId: string | null
          measureUnitName: string | null
      }

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

function buildBudgetLineCreateBody(
    values: FormValues,
    libraryBinding: LibraryBinding,
    workCategoryNoneValue: string
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
        if (values.workCategoryId !== workCategoryNoneValue) {
            body.workCategoryId = values.workCategoryId
        }
    }
    return body
}

function ensureManualWorkCategoryForSubmit(args: {
    submitted: FormValues
    libraryBinding: LibraryBinding
    categories: WorkCategoryRow[]
    workCategoryNoneValue: string
    setWorkCategory: (value: string) => void
}): FormValues | null {
    if (args.libraryBinding != null) {
        return args.submitted
    }
    if (args.submitted.workCategoryId !== args.workCategoryNoneValue) {
        return args.submitted
    }
    const fallback = args.categories[FIRST_ITEM_INDEX]?.id
    if (!fallback) {
        return null
    }
    args.setWorkCategory(fallback)
    return {
        ...args.submitted,
        workCategoryId: fallback,
    }
}

function toLibraryBindingFromSuggestion(row: SuggestionRow): LibraryBinding {
    if (row.kind === 'yield') {
        return {
            kind: 'yield',
            yieldId: row.yieldId,
            workCategoryName: row.workCategoryName,
            measureUnitId: row.measureUnitId,
            measureUnitName: row.measureUnitName,
        }
    }
    return {
        kind: 'catalog',
        catalogItemId: row.catalogItemId,
        workCategoryId: row.workCategoryId,
        workCategoryName: row.workCategoryName,
        measureUnitId: row.measureUnitId,
        measureUnitName: row.measureUnitName,
    }
}

function handleDescriptionEscapeKey(args: {
    event: KeyboardEvent<HTMLInputElement>
    showSuggestions: boolean
    rows: SuggestionRow[]
    setSuggestionsOpen: (open: boolean) => void
    setActiveSuggestionIndex: Dispatch<SetStateAction<number>>
}): boolean {
    if (args.event.key !== 'Escape') {
        return false
    }
    if (!args.showSuggestions && args.rows.length === EMPTY_COLLECTION_LENGTH) {
        args.setSuggestionsOpen(false)
        return true
    }
    args.event.preventDefault()
    args.setSuggestionsOpen(false)
    args.setActiveSuggestionIndex(NO_ACTIVE_SUGGESTION_INDEX)
    return true
}

function handleDescriptionSuggestionKey(args: {
    event: KeyboardEvent<HTMLInputElement>
    showSuggestions: boolean
    rows: SuggestionRow[]
    activeSuggestionIndex: number
    setSuggestionsOpen: (open: boolean) => void
    setActiveSuggestionIndex: Dispatch<SetStateAction<number>>
    onPick: (row: SuggestionRow) => void
}): void {
    if (handleDescriptionEscapeKey(args)) {
        return
    }
    if (!args.showSuggestions || args.rows.length === EMPTY_COLLECTION_LENGTH) {
        return
    }
    if (args.event.key === 'ArrowDown') {
        args.event.preventDefault()
        args.setActiveSuggestionIndex((i) => {
            if (i < EMPTY_COLLECTION_LENGTH) return FIRST_ITEM_INDEX
            return i < args.rows.length - SUGGESTION_INDEX_STEP
                ? i + SUGGESTION_INDEX_STEP
                : i
        })
        return
    }
    if (args.event.key === 'ArrowUp') {
        args.event.preventDefault()
        args.setActiveSuggestionIndex((i) =>
            i > EMPTY_COLLECTION_LENGTH
                ? i - SUGGESTION_INDEX_STEP
                : NO_ACTIVE_SUGGESTION_INDEX
        )
        return
    }
    if (
        args.event.key !== 'Enter' ||
        args.activeSuggestionIndex < EMPTY_COLLECTION_LENGTH
    ) {
        return
    }
    const activeRow = args.rows[args.activeSuggestionIndex]
    if (!activeRow) {
        return
    }
    args.event.preventDefault()
    args.onPick(activeRow)
}

function filterUnusedSuggestions(args: {
    fuse: ReturnType<typeof useBudgetLineDescriptionSuggestions>['fuse']
    suggestionRows: SuggestionRow[]
    description: string
    workCategoryId: string
    usedCatalogItemIds: Set<string>
    usedItemYieldIds: Set<string>
}): SuggestionRow[] {
    const rows = filterBudgetLineSuggestionRows(
        args.fuse,
        args.suggestionRows,
        args.description,
        args.workCategoryId === WORK_CATEGORY_NONE ? null : args.workCategoryId
    )
    return rows.filter((row) =>
        row.kind === 'catalog'
            ? !args.usedCatalogItemIds.has(row.catalogItemId)
            : !args.usedItemYieldIds.has(row.yieldId)
    )
}

function shouldShowSuggestionPanel(args: {
    open: boolean
    libraryBinding: LibraryBinding
    suggestionsOpen: boolean
    queryEnabled: boolean
    suggestionsLoading: boolean
    hasCorpus: boolean
}): boolean {
    return (
        args.open &&
        !args.libraryBinding &&
        args.suggestionsOpen &&
        args.queryEnabled &&
        !args.suggestionsLoading &&
        args.hasCorpus
    )
}

function openSuggestionsWhenFreeLine(args: {
    libraryBinding: LibraryBinding
    setSuggestionsOpen: (open: boolean) => void
}): void {
    if (args.libraryBinding != null) {
        return
    }
    args.setSuggestionsOpen(true)
}

function onDescriptionInputChange(args: {
    libraryBinding: LibraryBinding
    setSuggestionsOpen: (open: boolean) => void
    setActiveSuggestionIndex: (index: number) => void
}): void {
    args.setActiveSuggestionIndex(NO_ACTIVE_SUGGESTION_INDEX)
    if (args.libraryBinding != null) {
        return
    }
    args.setSuggestionsOpen(true)
}

function workCategoryFromSuggestion(row: SuggestionRow): string {
    return row.kind === 'yield' ? WORK_CATEGORY_NONE : row.workCategoryId
}

function resetDialogForm(args: {
    form: UseFormReturn<FormValues>
    defaultForm: FormValues
    defaultWorkCategoryId: string | null
    setLibraryBinding: (value: LibraryBinding) => void
    setSuggestionsOpen: (open: boolean) => void
    setActiveSuggestionIndex: (index: number) => void
}): void {
    args.form.reset({
        ...args.defaultForm,
        workCategoryId: args.defaultWorkCategoryId ?? WORK_CATEGORY_NONE,
    })
    args.setLibraryBinding(null)
    args.setSuggestionsOpen(false)
    args.setActiveSuggestionIndex(NO_ACTIVE_SUGGESTION_INDEX)
}

function renderCreateBudgetLineTrigger(args: {
    trigger: ReactNode
    onOpen: () => void
}): ReactNode {
    if (!args.trigger) {
        return (
            <Button
                type="button"
                size="sm"
                className="gap-2"
                onClick={args.onOpen}
            >
                <Plus className="h-4 w-4" />
                Nueva línea
            </Button>
        )
    }
    if (!isValidElement(args.trigger)) {
        return null
    }
    const triggerElement = args.trigger as ReactElement<{
        onClick?: (event: MouseEvent<HTMLElement>) => void
    }>
    return cloneElement(triggerElement, {
        onClick: (event: MouseEvent<HTMLElement>) => {
            triggerElement.props.onClick?.(event)
            if (!event.defaultPrevented) {
                args.onOpen()
            }
        },
    })
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
    setLibraryBinding: (value: LibraryBinding) => void
    setOpen: (open: boolean) => void
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
        try {
            const created = await createProjectBudgetLine(
                args.activeProjectId,
                baseBody as unknown as CreateBudgetLineInput,
                { token: args.accessToken, studioSlug: args.studioSlug }
            )
            await args.queryClient.invalidateQueries({
                queryKey: qk.budgetLines(args.studioSlug, args.activeProjectId),
            })
            await args.queryClient.invalidateQueries({
                queryKey: qk.dashboard(args.studioSlug, args.activeProjectId),
            })
            toast.success('Línea de presupuesto creada', {
                description: created.description,
            })
            args.form.reset(args.defaultForm)
            args.setLibraryBinding(null)
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
        const fallback = args.categories[FIRST_ITEM_INDEX]?.id
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
    breakdownSum: number
    unitPriceStr: string
    form: UseFormReturn<FormValues>
}): void {
    useEffect(() => {
        if (!args.open || !args.isBreakdownActive) {
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
        args.unitPriceStr,
    ])
}

interface CreateBudgetLineDialogProps {
    trigger?: ReactNode
    defaultWorkCategoryId?: string | null
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
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const { activeProject } = useProject()
    const queryClient = useQueryClient()

    const defaultForm: FormValues = {
        description: '',
        workCategoryId: defaultWorkCategoryId ?? WORK_CATEGORY_NONE,
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
        enabled: open && isQueryReady,
    })

    const { data: measureUnits = [], isPending: measureUnitsLoading } =
        useQuery({
            queryKey: qk.measureUnits(studioSlug),
            queryFn: () =>
                getMeasureUnits({
                    token: accessToken,
                    studioSlug,
                }),
            enabled: open && isQueryReady,
        })

    const { data: existingBudgetLines = [] } = useQuery({
        queryKey: qk.budgetLines(studioSlug, activeProject.id),
        queryFn: () =>
            getProjectBudgetLines(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: open && isQueryReady,
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
        breakdownSum,
        unitPriceStr: values.unitPriceStr,
        form,
    })

    const handleSuggestionPick = (row: SuggestionRow) => {
        const measureUnitId = row.measureUnitId ?? UNIT_NONE

        form.setValue('description', row.name, { shouldValidate: true })
        form.setValue('workCategoryId', workCategoryFromSuggestion(row), {
            shouldValidate: true,
        })
        form.setValue('measureUnitId', measureUnitId, {
            shouldValidate: true,
        })
        setLibraryBinding(toLibraryBindingFromSuggestion(row))
        setSuggestionsOpen(false)
        setActiveSuggestionIndex(NO_ACTIVE_SUGGESTION_INDEX)
    }

    const clearLibraryBinding = () => {
        setLibraryBinding(null)
        form.setValue('measureUnitId', UNIT_NONE, { shouldValidate: true })
        form.setValue(
            'workCategoryId',
            defaultWorkCategoryId ?? WORK_CATEGORY_NONE,
            {
                shouldValidate: true,
            }
        )
    }

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
        setLibraryBinding,
        setOpen,
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

    return (
        <>
            {renderCreateBudgetLineTrigger({
                trigger,
                onOpen: () => setOpen(true),
            })}
            <BudgetLineDialogShell
                open={open}
                onClose={() => {
                    setOpen(false)
                    resetDialog()
                }}
                title="Nuevo ítem de presupuesto"
                onSubmit={form.handleSubmit(onSubmit)}
                submitLabel="Crear"
                submittingLabel="Creando…"
                isSubmitting={form.formState.isSubmitting}
            >
                <CreateBudgetLineDialogFormFields
                    form={form as UseFormReturn<BudgetLineCreateFormValues>}
                    values={values}
                    libraryBinding={libraryBinding}
                    categories={categories}
                    categoriesLoading={categoriesLoading}
                    measureUnits={measureUnits}
                    measureUnitsLoading={measureUnitsLoading}
                    workCategoryNoneValue={WORK_CATEGORY_NONE}
                    unitNone={UNIT_NONE}
                    showSuggestions={showSuggestions}
                    suggestionsLoading={suggestionsLoading}
                    filteredSuggestionRows={filteredSuggestionRows}
                    suggestionListboxId={SUGGESTION_LISTBOX_ID}
                    activeSuggestionIndex={activeSuggestionIndex}
                    setActiveSuggestionIndex={setActiveSuggestionIndex}
                    onDescriptionKeyDown={onDescriptionKeyDown}
                    onDescriptionFocus={() => {
                        openSuggestionsWhenFreeLine({
                            libraryBinding,
                            setSuggestionsOpen,
                        })
                    }}
                    onDescriptionBlur={() => {
                        window.setTimeout(() => {
                            setSuggestionsOpen(false)
                        }, SUGGESTION_CLOSE_DELAY_MS)
                    }}
                    onDescriptionInput={() => {
                        onDescriptionInputChange({
                            libraryBinding,
                            setSuggestionsOpen,
                            setActiveSuggestionIndex,
                        })
                    }}
                    onClearLibraryBinding={clearLibraryBinding}
                    handleSuggestionPick={handleSuggestionPick}
                    isBreakdownActive={isBreakdownActive}
                />
            </BudgetLineDialogShell>
        </>
    )
}
