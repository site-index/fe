import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    type KeyboardEvent,
    type ReactNode,
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
import {
    appendOptionalBudgetNumericFields,
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
