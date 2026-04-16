import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    type KeyboardEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useForm, type UseFormReturn, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
    type BudgetLineParameterConfigRow,
    type BudgetLineParameterValueInput,
    type CreateBudgetLineInput,
    createProjectBudgetLine,
    getBudgetLineParameterConfig,
    getProjectBudgetLines,
} from '@/api/budget-lines.api'
import { getMeasureUnits, getWorkCategories } from '@/api/catalog.api'
import type { ItemYieldLineInput } from '@/api/item-yields.api'
import { getProjectItemYields } from '@/api/item-yields.api'
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
    buildOptionalParameterValues,
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
import { Input } from '@/components/ui/input'
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
import type { ItemYield } from '@/types/item-yield'
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
const EMPTY_PARAMETER_CONFIG_ROWS: BudgetLineParameterConfigRow[] = []
const AREA_PARAMETER_KEY = 'areaM2'
const VOLUME_PARAMETER_KEY = 'volumeM3'
const THICKNESS_PARAMETER_KEY = 'thickness'
const DERIVED_PARAMETER_DECIMALS = 6

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

function parseFiniteNumberFromInput(value: string | undefined): number | null {
    if (!value) {
        return null
    }
    const parsed = Number(value.trim())
    if (!Number.isFinite(parsed)) {
        return null
    }
    return parsed
}

function toDerivedParameterValue(value: number): string {
    return String(Number(value.toFixed(DERIVED_PARAMETER_DECIMALS)))
}

function setFiniteDerivedValue(
    valuesById: Record<string, string>,
    parameterDefinitionId: string,
    value: number
): Record<string, string> {
    if (!Number.isFinite(value)) {
        return valuesById
    }
    return {
        ...valuesById,
        [parameterDefinitionId]: toDerivedParameterValue(value),
    }
}

function deriveFromVolumeChange(args: {
    valuesById: Record<string, string>
    volumeId: string
    areaId: string
    thicknessId: string
}): Record<string, string> {
    const volume = parseFiniteNumberFromInput(args.valuesById[args.volumeId])
    const area = parseFiniteNumberFromInput(args.valuesById[args.areaId])
    const thickness = parseFiniteNumberFromInput(
        args.valuesById[args.thicknessId]
    )
    if (volume == null) {
        return args.valuesById
    }
    if (area != null && area > ZERO_VALUE) {
        return setFiniteDerivedValue(
            args.valuesById,
            args.thicknessId,
            volume / area
        )
    }
    if (thickness != null && thickness > ZERO_VALUE) {
        return setFiniteDerivedValue(
            args.valuesById,
            args.areaId,
            volume / thickness
        )
    }
    return args.valuesById
}

function deriveFromAreaChange(args: {
    valuesById: Record<string, string>
    volumeId: string
    areaId: string
    thicknessId: string
}): Record<string, string> {
    const volume = parseFiniteNumberFromInput(args.valuesById[args.volumeId])
    const area = parseFiniteNumberFromInput(args.valuesById[args.areaId])
    const thickness = parseFiniteNumberFromInput(
        args.valuesById[args.thicknessId]
    )
    if (area == null) {
        return args.valuesById
    }
    if (volume != null && area > ZERO_VALUE) {
        return setFiniteDerivedValue(
            args.valuesById,
            args.thicknessId,
            volume / area
        )
    }
    if (thickness != null) {
        return setFiniteDerivedValue(
            args.valuesById,
            args.volumeId,
            area * thickness
        )
    }
    return args.valuesById
}

function deriveFromThicknessChange(args: {
    valuesById: Record<string, string>
    volumeId: string
    areaId: string
    thicknessId: string
}): Record<string, string> {
    const volume = parseFiniteNumberFromInput(args.valuesById[args.volumeId])
    const area = parseFiniteNumberFromInput(args.valuesById[args.areaId])
    const thickness = parseFiniteNumberFromInput(
        args.valuesById[args.thicknessId]
    )
    if (thickness == null) {
        return args.valuesById
    }
    if (area != null) {
        return setFiniteDerivedValue(
            args.valuesById,
            args.volumeId,
            area * thickness
        )
    }
    if (volume != null && thickness > ZERO_VALUE) {
        return setFiniteDerivedValue(
            args.valuesById,
            args.areaId,
            volume / thickness
        )
    }
    return args.valuesById
}

function applyDerivedGeometryByKey(args: {
    changedKey: string
    valuesById: Record<string, string>
    parameterIdByKey: Record<string, string>
}): Record<string, string> {
    const volumeId = args.parameterIdByKey[VOLUME_PARAMETER_KEY]
    const areaId = args.parameterIdByKey[AREA_PARAMETER_KEY]
    const thicknessId = args.parameterIdByKey[THICKNESS_PARAMETER_KEY]
    if (!volumeId || !areaId || !thicknessId) {
        return args.valuesById
    }

    if (args.changedKey === VOLUME_PARAMETER_KEY) {
        return deriveFromVolumeChange({
            valuesById: args.valuesById,
            volumeId,
            areaId,
            thicknessId,
        })
    }

    if (args.changedKey === AREA_PARAMETER_KEY) {
        return deriveFromAreaChange({
            valuesById: args.valuesById,
            volumeId,
            areaId,
            thicknessId,
        })
    }

    if (args.changedKey === THICKNESS_PARAMETER_KEY) {
        return deriveFromThicknessChange({
            valuesById: args.valuesById,
            volumeId,
            areaId,
            thicknessId,
        })
    }

    return args.valuesById
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
    parameterValues: BudgetLineParameterValueInput[]
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
        if (args.parameterValues.length > 0) {
            baseBody.parameterValues = args.parameterValues
        }
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

function BudgetLineParameterInputsSection(args: {
    params: BudgetLineParameterConfigRow[]
    valuesById: Record<string, string>
    setValue: (parameterDefinitionId: string, value: string) => void
}) {
    const visibleParams = args.params
    if (visibleParams.length === 0) {
        return null
    }
    return (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
                Parámetros relacionados (opcionales)
            </p>
            <div
                className="grid gap-2"
                style={{
                    gridTemplateColumns: `repeat(${visibleParams.length}, minmax(0, 1fr))`,
                }}
            >
                {visibleParams.map((param) => (
                    <label
                        key={`${param.parameterDefinitionId}-label`}
                        className="truncate text-center text-sm font-medium"
                        title={param.label}
                    >
                        {param.label}
                    </label>
                ))}
                {visibleParams.map((param) => {
                    const value =
                        args.valuesById[param.parameterDefinitionId] ?? ''
                    if (param.valueType === 'BOOLEAN') {
                        return (
                            <select
                                key={param.parameterDefinitionId}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                aria-label={param.label}
                                value={value}
                                onChange={(event) =>
                                    args.setValue(
                                        param.parameterDefinitionId,
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">Sin definir</option>
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                            </select>
                        )
                    }
                    return (
                        <Input
                            key={param.parameterDefinitionId}
                            aria-label={param.label}
                            value={value}
                            inputMode={
                                param.valueType === 'TEXT'
                                    ? undefined
                                    : 'decimal'
                            }
                            placeholder={param.valueType === 'TEXT' ? '—' : '0'}
                            onChange={(event) =>
                                args.setValue(
                                    param.parameterDefinitionId,
                                    event.target.value
                                )
                            }
                        />
                    )
                })}
            </div>
        </div>
    )
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

function toYieldLineInputs(
    components: ItemYield['components']
): ItemYieldLineInput[] {
    return components.map((line) => ({
        resourceId: line.resourceId,
        quantity: line.quantity,
        billingMode: line.billingMode,
        customDriverKey: line.customDriverKey,
    }))
}

function resolveInitialYieldProposal(args: {
    libraryBinding: LibraryBinding
    projectItemYields: ItemYield[]
}): ItemYieldLineInput[] | null {
    if (args.libraryBinding == null) {
        return null
    }
    if (args.libraryBinding.kind === 'yield') {
        const yieldId = args.libraryBinding.yieldId
        const source = args.projectItemYields.find(
            (itemYield) => itemYield.id === yieldId
        )
        return source ? toYieldLineInputs(source.components) : null
    }
    const catalogItemId = args.libraryBinding.catalogItemId
    const source = args.projectItemYields.find(
        (itemYield) => itemYield.catalogItemId === catalogItemId
    )
    return source ? toYieldLineInputs(source.components) : null
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

function isParameterConfigQueryEnabled(args: {
    isOpenAndQueryReady: boolean
    selectedItemTypeStableId: string | null
}): boolean {
    if (!args.isOpenAndQueryReady) {
        return false
    }
    return (
        args.selectedItemTypeStableId != null &&
        args.selectedItemTypeStableId !== ''
    )
}

function resolveSelectedItemTypeStableId(
    libraryBinding: LibraryBinding
): string | null {
    return libraryBinding?.itemTypeStableId ?? null
}

function shouldHideWorkCategoryField(
    defaultWorkCategoryId: string | null | undefined
): boolean {
    return defaultWorkCategoryId != null
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
    onQuantityChange: (value: string) => void
    isBreakdownActive: boolean
    pricingLockedByYield: boolean
    parameterConfigRows: BudgetLineParameterConfigRow[]
    parameterValuesById: Record<string, string>
    setParameterValueById: (
        parameterDefinitionId: string,
        value: string
    ) => void
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
                    onQuantityChange={props.onQuantityChange}
                    isBreakdownActive={props.isBreakdownActive}
                    pricingLockedByYield={props.pricingLockedByYield}
                    hideWorkCategoryField={props.hideWorkCategoryField}
                    topSection={
                        <BudgetLineParameterInputsSection
                            params={props.parameterConfigRows}
                            valuesById={props.parameterValuesById}
                            setValue={props.setParameterValueById}
                        />
                    }
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
    const [parameterValuesById, setParameterValuesById] = useState<
        Record<string, string>
    >({})
    const { accessToken, studioSlug, isQueryReady } = useAuth()
    const { activeProject } = useProject()
    const queryClient = useQueryClient()
    const resolvedDefaultWorkCategoryId = resolveDefaultWorkCategoryId(
        defaultWorkCategoryId
    )
    const hideWorkCategoryField = shouldHideWorkCategoryField(
        defaultWorkCategoryId
    )
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
    const selectedItemTypeStableId =
        resolveSelectedItemTypeStableId(libraryBinding)
    const { data: parameterConfig } = useQuery({
        queryKey: qk.budgetLinesParameterConfig(
            studioSlug,
            activeProject.id,
            selectedItemTypeStableId
        ),
        queryFn: () =>
            getBudgetLineParameterConfig(
                activeProject.id,
                selectedItemTypeStableId!,
                {
                    token: accessToken,
                    studioSlug,
                }
            ),
        enabled: isParameterConfigQueryEnabled({
            isOpenAndQueryReady,
            selectedItemTypeStableId,
        }),
    })
    const parameterConfigRows =
        parameterConfig?.params ?? EMPTY_PARAMETER_CONFIG_ROWS
    const parameterIdByKey = useMemo(
        () =>
            Object.fromEntries(
                parameterConfigRows.map((param) => [
                    param.key,
                    param.parameterDefinitionId,
                ])
            ),
        [parameterConfigRows]
    )
    const parameterValuesForSubmit = useMemo(
        () =>
            buildOptionalParameterValues({
                params: parameterConfigRows,
                valuesByParameterId: parameterValuesById,
            }),
        [parameterConfigRows, parameterValuesById]
    )

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
    const { data: projectItemYields = [] } = useQuery({
        queryKey: qk.itemYields(studioSlug, activeProject.id),
        queryFn: () =>
            getProjectItemYields(activeProject.id, {
                token: accessToken,
                studioSlug,
            }),
        enabled: isOpenAndQueryReady,
    })
    const hasAutoProposedYieldRef = useRef(false)

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
        hasAutoProposedYieldRef.current = false
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
        parameterValues: parameterValuesForSubmit,
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
    const setDerivedParameterValueById = (
        parameterDefinitionId: string,
        value: string,
        changedKey: string | undefined
    ) => {
        setParameterValuesById((current) => {
            const withCurrentValue = {
                ...current,
                [parameterDefinitionId]: value,
            }
            if (!changedKey) {
                return withCurrentValue
            }
            return applyDerivedGeometryByKey({
                changedKey,
                valuesById: withCurrentValue,
                parameterIdByKey,
            })
        })
        if (changedKey === AREA_PARAMETER_KEY) {
            const nextQuantity = value.trim()
            if (form.getValues('quantityStr') !== nextQuantity) {
                form.setValue('quantityStr', nextQuantity, {
                    shouldValidate: true,
                })
            }
        }
    }
    const onQuantityChange = (value: string) => {
        const areaParameterId = parameterIdByKey[AREA_PARAMETER_KEY]
        if (!areaParameterId) {
            return
        }
        setDerivedParameterValueById(
            areaParameterId,
            value.trim(),
            AREA_PARAMETER_KEY
        )
    }
    const maybeAutoProposeYieldSetup = (): void => {
        if (hasAutoProposedYieldRef.current || yieldLines.length > 0) {
            return
        }
        const initialProposal = resolveInitialYieldProposal({
            libraryBinding,
            projectItemYields,
        })
        if (!initialProposal || initialProposal.length === 0) {
            return
        }
        setYieldLines(initialProposal)
        setIncludeYieldSetup(true)
        hasAutoProposedYieldRef.current = true
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
            onQuantityChange={onQuantityChange}
            isBreakdownActive={isBreakdownActive}
            pricingLockedByYield={pricingLockedByYield}
            parameterConfigRows={parameterConfigRows}
            parameterValuesById={parameterValuesById}
            setParameterValueById={(parameterDefinitionId, value) => {
                const changedKey = parameterConfigRows.find(
                    (param) =>
                        param.parameterDefinitionId === parameterDefinitionId
                )?.key
                setDerivedParameterValueById(
                    parameterDefinitionId,
                    value,
                    changedKey
                )
                maybeAutoProposeYieldSetup()
            }}
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
