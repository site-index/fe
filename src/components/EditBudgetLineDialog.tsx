import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useForm, type UseFormReturn, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
    type PatchBudgetLineInput,
    patchProjectBudgetLine,
} from '@/api/budget-lines.api'
import { getMeasureUnits, getWorkCategories } from '@/api/catalog.api'
import { getProjectItemYieldOptions } from '@/api/item-yields.api'
import BudgetLineDialogShell from '@/components/BudgetLineDialogShell'
import { BudgetLineItemYieldSelect } from '@/components/BudgetLineItemYieldSelect'
import {
    type BudgetLineCreateFormValues,
    CreateBudgetLineDialogFormFields,
} from '@/components/create-budget-line-dialog-form-fields'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { getApiErrorMessage } from '@/lib/api'
import {
    breakdownSumFromStrings,
    isBreakdownActiveFromStrings,
    optionalNonNegStr,
    toNum,
} from '@/lib/form-utils'
import { qk } from '@/lib/query-keys'
import type { BudgetLineRow } from '@/types/budget-line'

const WORK_CATEGORY_NONE = '__none__'
const UNIT_NONE = '__none__'
const DESCRIPTION_MAX_LENGTH = 2000
const MIN_DESCRIPTION_LENGTH = 1
const ZERO_AMOUNT = 0
const NO_ACTIVE_SUGGESTION_INDEX = -1

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
    itemYieldId: z.string().uuid().nullable(),
})

type FormValues = z.infer<typeof schema>

interface EditBudgetLineDialogProps {
    line: BudgetLineRow | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onLineUpdated?: (line: BudgetLineRow) => void
}

function formDefaultsFromLine(line: BudgetLineRow): FormValues {
    return {
        description: line.description,
        workCategoryId: line.workCategoryId ?? WORK_CATEGORY_NONE,
        measureUnitId: line.measureUnit?.id ?? UNIT_NONE,
        quantityStr: String(line.quantity),
        unitPriceStr: String(
            line.unitPriceStored ?? line.unitPrice ?? ZERO_AMOUNT
        ),
        amountMaterialStr: String(line.amountMaterial),
        amountLaborStr: String(line.amountLabor),
        amountEquipmentStr: String(line.amountEquipment),
        itemYieldId: line.itemYieldId,
    }
}

function patchInputFromValues(values: FormValues): PatchBudgetLineInput {
    const usesBreakdown = isBreakdownActiveFromStrings(values)
    const normalizedValues = usesBreakdown
        ? {
              ...values,
              unitPriceStr: String(breakdownSumFromStrings(values)),
          }
        : values
    return {
        description: normalizedValues.description.trim(),
        itemYieldId: normalizedValues.itemYieldId,
        workCategoryId:
            normalizedValues.itemYieldId == null
                ? normalizedValues.workCategoryId === WORK_CATEGORY_NONE
                    ? null
                    : normalizedValues.workCategoryId
                : undefined,
        measureUnitId:
            normalizedValues.measureUnitId === UNIT_NONE
                ? null
                : normalizedValues.measureUnitId,
        quantity:
            normalizedValues.quantityStr.trim() === ''
                ? null
                : toNum(normalizedValues.quantityStr),
        unitPrice:
            normalizedValues.unitPriceStr.trim() === ''
                ? null
                : toNum(normalizedValues.unitPriceStr),
        amountMaterial:
            normalizedValues.amountMaterialStr.trim() === ''
                ? ZERO_AMOUNT
                : toNum(normalizedValues.amountMaterialStr),
        amountLabor:
            normalizedValues.amountLaborStr.trim() === ''
                ? ZERO_AMOUNT
                : toNum(normalizedValues.amountLaborStr),
        amountEquipment:
            normalizedValues.amountEquipmentStr.trim() === ''
                ? ZERO_AMOUNT
                : toNum(normalizedValues.amountEquipmentStr),
    }
}

export default function EditBudgetLineDialog({
    line,
    open,
    onOpenChange,
    onLineUpdated,
}: EditBudgetLineDialogProps) {
    const { accessToken, studioSlug } = useAuth()
    const { activeProject } = useProject()
    const queryClient = useQueryClient()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            description: '',
            workCategoryId: WORK_CATEGORY_NONE,
            measureUnitId: UNIT_NONE,
            quantityStr: '',
            unitPriceStr: '',
            amountMaterialStr: '',
            amountLaborStr: '',
            amountEquipmentStr: '',
            itemYieldId: null,
        },
    })

    useEffect(() => {
        if (!line || !open) {
            return
        }
        form.reset(formDefaultsFromLine(line))
    }, [form, line, open])

    const values = useWatch({
        control: form.control,
        defaultValue: form.getValues(),
    }) as FormValues
    const breakdownSum = breakdownSumFromStrings(values)
    const isBreakdownActive = isBreakdownActiveFromStrings(values)

    useEffect(() => {
        if (!open || !isBreakdownActive) {
            return
        }
        const nextUnitPrice = String(breakdownSum)
        if (values.unitPriceStr !== nextUnitPrice) {
            form.setValue('unitPriceStr', nextUnitPrice, {
                shouldValidate: true,
            })
        }
    }, [breakdownSum, form, isBreakdownActive, open, values.unitPriceStr])

    const queryEnabled = open && activeProject.id !== '__empty__'
    const { data: categories = [], isPending: categoriesLoading } = useQuery({
        queryKey: qk.workCategories(studioSlug),
        queryFn: () =>
            getWorkCategories({
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })
    const { data: measureUnits = [], isPending: measureUnitsLoading } =
        useQuery({
            queryKey: qk.measureUnits(studioSlug),
            queryFn: () =>
                getMeasureUnits({
                    token: accessToken,
                    studioSlug,
                }),
            enabled: queryEnabled,
        })
    const { data: itemYields = [] } = useQuery({
        queryKey: qk.itemYields(studioSlug, activeProject.id),
        queryFn: () =>
            getProjectItemYieldOptions(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: queryEnabled,
    })

    const selectedYield = useMemo(
        () => itemYields.find((y) => y.id === values.itemYieldId) ?? null,
        [itemYields, values.itemYieldId]
    )

    const handleSubmit = async (submitted: FormValues) => {
        if (!line) {
            return
        }
        try {
            const input = patchInputFromValues(submitted)
            const updated = await patchProjectBudgetLine(
                activeProject.id,
                line.id,
                input,
                {
                    token: accessToken,
                    studioSlug,
                }
            )
            await queryClient.invalidateQueries({
                queryKey: qk.budgetLines(studioSlug, activeProject.id),
            })
            await queryClient.invalidateQueries({
                queryKey: qk.dashboard(studioSlug, activeProject.id),
            })
            onLineUpdated?.(updated)
            toast.success('Ítem actualizado', {
                description: updated.description,
            })
            onOpenChange(false)
        } catch (err) {
            toast.error('No se pudo guardar', {
                description: getApiErrorMessage(err),
            })
        }
    }

    if (!line) {
        return null
    }

    return (
        <BudgetLineDialogShell
            open={open}
            onClose={() => onOpenChange(false)}
            title="Editar ítem de presupuesto"
            onSubmit={form.handleSubmit(handleSubmit)}
            submitLabel="Guardar"
            submittingLabel="Guardando…"
            isSubmitting={form.formState.isSubmitting}
        >
            <CreateBudgetLineDialogFormFields
                form={
                    form as unknown as UseFormReturn<BudgetLineCreateFormValues>
                }
                values={values as BudgetLineCreateFormValues}
                libraryBinding={null}
                categories={categories}
                categoriesLoading={categoriesLoading}
                measureUnits={measureUnits}
                measureUnitsLoading={measureUnitsLoading}
                workCategoryNoneValue={WORK_CATEGORY_NONE}
                unitNone={UNIT_NONE}
                showSuggestions={false}
                suggestionsLoading={false}
                filteredSuggestionRows={[]}
                suggestionListboxId="edit-budget-line-suggestion-listbox"
                activeSuggestionIndex={NO_ACTIVE_SUGGESTION_INDEX}
                setActiveSuggestionIndex={() => {}}
                onDescriptionKeyDown={() => {}}
                onDescriptionFocus={() => {}}
                onDescriptionBlur={() => {}}
                onDescriptionInput={() => {}}
                onClearLibraryBinding={() => {}}
                handleSuggestionPick={() => {}}
                isBreakdownActive={isBreakdownActive}
                showCatalogSuggestionHint={false}
                topSection={
                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Rendimiento vinculado
                            </p>
                            <BudgetLineItemYieldSelect
                                line={{
                                    ...line,
                                    itemYieldId: values.itemYieldId,
                                }}
                                yields={itemYields}
                                disabled={form.formState.isSubmitting}
                                onChange={(_, itemYieldId) => {
                                    form.setValue('itemYieldId', itemYieldId)
                                    const nextYield =
                                        itemYields.find(
                                            (item) => item.id === itemYieldId
                                        ) ?? null
                                    if (nextYield) {
                                        form.setValue(
                                            'workCategoryId',
                                            nextYield.workCategoryId,
                                            { shouldValidate: true }
                                        )
                                    }
                                }}
                            />
                        </div>
                        {selectedYield ? (
                            <p className="text-xs text-muted-foreground">
                                El rubro queda asociado al rendimiento
                                seleccionado.
                            </p>
                        ) : null}
                    </div>
                }
            />
        </BudgetLineDialogShell>
    )
}
