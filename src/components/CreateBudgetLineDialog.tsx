import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import {
    cloneElement,
    isValidElement,
    type KeyboardEvent,
    type MouseEvent,
    type ReactElement,
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
} from '@/api/budget-lines.api'
import { getMeasureUnits, getWorkCategories } from '@/api/catalog.api'
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
import { optionalNonNegStr, toNum } from '@/lib/form-utils'
import { qk } from '@/lib/query-keys'

const RUBRO_NONE = '__none__'
const UNIT_NONE = '__none__'
const SUGGESTION_LISTBOX_ID = 'create-budget-line-suggestion-listbox'

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
    defaultWorkCategoryId?: string | null
}

// eslint-disable-next-line complexity
export default function CreateBudgetLineDialog({
    trigger,
    defaultWorkCategoryId = null,
}: CreateBudgetLineDialogProps) {
    const [open, setOpen] = useState(false)
    const [libraryBinding, setLibraryBinding] = useState<LibraryBinding>(null)
    const [suggestionsOpen, setSuggestionsOpen] = useState(false)
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const { activeProject } = useProject()
    const queryClient = useQueryClient()

    const defaultForm: FormValues = {
        description: '',
        workCategoryId: defaultWorkCategoryId ?? RUBRO_NONE,
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

    const { data: categories = [], isPending: categoriesLoading } = useQuery({
        queryKey: qk.workCategories,
        queryFn: () =>
            getWorkCategories({
                token: accessToken,
                studioSlug,
            }),
        enabled: open && isQueryReady,
    })

    const { data: measureUnits = [], isPending: measureUnitsLoading } =
        useQuery({
            queryKey: qk.measureUnits,
            queryFn: () =>
                getMeasureUnits({
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

    const filteredSuggestionRows = useMemo(
        () =>
            filterBudgetLineSuggestionRows(
                fuse,
                suggestionRows,
                values.description
            ),
        [fuse, suggestionRows, values.description]
    )

    const showSuggestions =
        open &&
        !libraryBinding &&
        suggestionsOpen &&
        queryEnabled &&
        !suggestionsLoading &&
        hasCorpus

    useEffect(() => {
        if (!open) {
            return
        }
        if (defaultWorkCategoryId) {
            form.setValue('workCategoryId', defaultWorkCategoryId, {
                shouldValidate: true,
            })
        }
    }, [defaultWorkCategoryId, form, open])

    useEffect(() => {
        if (libraryBinding == null) {
            return
        }
        if (libraryBinding.measureUnitId != null) {
            form.setValue('measureUnitId', libraryBinding.measureUnitId, {
                shouldValidate: true,
            })
        } else {
            form.setValue('measureUnitId', UNIT_NONE, { shouldValidate: true })
        }
    }, [libraryBinding, form])

    const handleSuggestionPick = (row: SuggestionRow) => {
        const measureUnitId = row.measureUnitId ?? UNIT_NONE

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
                measureUnitId: row.measureUnitId,
                measureUnitName: row.measureUnitName,
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
                catalogItemId: row.catalogItemId,
                workCategoryId: row.workCategoryId,
                workCategoryName: row.workCategoryName,
                measureUnitId: row.measureUnitId,
                measureUnitName: row.measureUnitName,
            })
        }
        setSuggestionsOpen(false)
        setActiveSuggestionIndex(-1)
    }

    const clearLibraryBinding = () => {
        setLibraryBinding(null)
        form.setValue('measureUnitId', UNIT_NONE, { shouldValidate: true })
        form.setValue('workCategoryId', defaultWorkCategoryId ?? RUBRO_NONE, {
            shouldValidate: true,
        })
    }

    const onDescriptionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || filteredSuggestionRows.length === 0) {
            if (event.key === 'Escape') {
                setSuggestionsOpen(false)
            }
            return
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveSuggestionIndex((i) => {
                if (i < 0) return 0
                return i < filteredSuggestionRows.length - 1 ? i + 1 : i
            })
            return
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveSuggestionIndex((i) => (i > 0 ? i - 1 : -1))
            return
        }
        if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
            const row = filteredSuggestionRows[activeSuggestionIndex]
            if (row) {
                event.preventDefault()
                handleSuggestionPick(row)
            }
            return
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            setSuggestionsOpen(false)
            setActiveSuggestionIndex(-1)
        }
    }

    const onSubmit = async (submitted: FormValues) => {
        try {
            const baseBody = buildBudgetLineCreateBody(
                submitted,
                libraryBinding,
                RUBRO_NONE
            )
            appendOptionalBudgetNumericFields(baseBody, submitted, UNIT_NONE)

            const created = await createProjectBudgetLine(
                activeProject.id,
                baseBody as unknown as CreateBudgetLineInput,
                { token: accessToken, studioSlug }
            )
            await queryClient.invalidateQueries({
                queryKey: qk.budgetLines(activeProject.id),
            })
            await queryClient.invalidateQueries({
                queryKey: qk.dashboard(activeProject.id),
            })
            toast.success('Línea de presupuesto creada', {
                description: created.description,
            })
            form.reset(defaultForm)
            setLibraryBinding(null)
            setOpen(false)
        } catch (err) {
            toast.error('No se pudo crear la línea', {
                description: getApiErrorMessage(err),
            })
        }
    }

    const resetDialog = () => {
        form.reset({
            ...defaultForm,
            workCategoryId: defaultWorkCategoryId ?? RUBRO_NONE,
        })
        setLibraryBinding(null)
        setSuggestionsOpen(false)
        setActiveSuggestionIndex(-1)
    }

    const renderTrigger = () => {
        if (!trigger) {
            return (
                <Button
                    type="button"
                    size="sm"
                    className="gap-2"
                    onClick={() => setOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    Nueva línea
                </Button>
            )
        }
        if (isValidElement(trigger)) {
            const triggerElement = trigger as ReactElement<{
                onClick?: (event: MouseEvent<HTMLElement>) => void
            }>
            return cloneElement(triggerElement, {
                onClick: (event: MouseEvent<HTMLElement>) => {
                    triggerElement.props.onClick?.(event)
                    if (!event.defaultPrevented) {
                        setOpen(true)
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
                onClose={() => {
                    setOpen(false)
                    resetDialog()
                }}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
                <div className="fixed inset-0 flex items-start justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4 sm:pt-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <DialogPanel className="flex max-h-[min(90vh,100dvh)] w-full max-w-none flex-col rounded-lg border bg-background shadow-lg sm:max-w-md">
                        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
                                Nuevo ítem de presupuesto
                            </DialogTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Cerrar"
                                onClick={() => {
                                    setOpen(false)
                                    resetDialog()
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="flex min-h-0 flex-1 flex-col"
                        >
                            <CreateBudgetLineDialogFormFields
                                form={
                                    form as UseFormReturn<BudgetLineCreateFormValues>
                                }
                                values={values}
                                libraryBinding={libraryBinding}
                                categories={categories}
                                categoriesLoading={categoriesLoading}
                                measureUnits={measureUnits}
                                measureUnitsLoading={measureUnitsLoading}
                                rubroNone={RUBRO_NONE}
                                unitNone={UNIT_NONE}
                                showSuggestions={showSuggestions}
                                suggestionsLoading={suggestionsLoading}
                                filteredSuggestionRows={filteredSuggestionRows}
                                suggestionListboxId={SUGGESTION_LISTBOX_ID}
                                activeSuggestionIndex={activeSuggestionIndex}
                                setActiveSuggestionIndex={
                                    setActiveSuggestionIndex
                                }
                                onDescriptionKeyDown={onDescriptionKeyDown}
                                onDescriptionFocus={() => {
                                    if (!libraryBinding) {
                                        setSuggestionsOpen(true)
                                    }
                                }}
                                onDescriptionBlur={() => {
                                    window.setTimeout(() => {
                                        setSuggestionsOpen(false)
                                    }, 200)
                                }}
                                onDescriptionInput={() => {
                                    setActiveSuggestionIndex(-1)
                                    if (!libraryBinding) {
                                        setSuggestionsOpen(true)
                                    }
                                }}
                                onClearLibraryBinding={clearLibraryBinding}
                                handleSuggestionPick={handleSuggestionPick}
                            />

                            <div className="flex shrink-0 justify-end border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                <Button
                                    type="submit"
                                    disabled={form.formState.isSubmitting}
                                >
                                    {form.formState.isSubmitting
                                        ? 'Creando…'
                                        : 'Crear'}
                                </Button>
                            </div>
                        </form>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
