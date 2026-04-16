import { Plus } from 'lucide-react'
import type {
    Dispatch,
    KeyboardEvent,
    MouseEvent,
    ReactElement,
    ReactNode,
    SetStateAction,
} from 'react'
import { cloneElement, isValidElement } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import type {
    BudgetLineParameterConfigRow,
    BudgetLineParameterValueInput,
} from '@/api/budget-lines.api'
import type { ItemYieldLineInput } from '@/api/item-yields.api'
import { Button } from '@/components/ui/button'
import type {
    SuggestionRow,
    useBudgetLineDescriptionSuggestions,
} from '@/components/use-budget-line-description-suggestions'
import { filterBudgetLineSuggestionRows } from '@/lib/budget-line-suggestion-filter'
import { toNum } from '@/lib/form-utils'
import type { WorkCategoryRow } from '@/types/work-category'

export const WORK_CATEGORY_NONE = '__none__'
export const UNIT_NONE = '__none__'
export const SUGGESTION_LISTBOX_ID = 'create-budget-line-suggestion-listbox'
export const DESCRIPTION_MAX_LENGTH = 2000
export const SUGGESTION_CLOSE_DELAY_MS = 200
export const MIN_DESCRIPTION_LENGTH = 1
export const NO_ACTIVE_SUGGESTION_INDEX = -1

export type LibraryBinding =
    | null
    | {
          kind: 'yield'
          yieldId: string
          itemTypeStableId: string | null
          workCategoryName: string
          measureUnitId: string | null
          measureUnitName: string | null
      }
    | {
          kind: 'catalog'
          catalogItemId: string
          itemTypeStableId: string
          workCategoryId: string
          workCategoryName: string
          measureUnitId: string | null
          measureUnitName: string | null
      }

/** Fields shared by all budget-line form shapes. Helpers accept this loose
 *  interface so they work with both the Zod-inferred type and plain objects. */
export interface FormValuesBase {
    description: string
    workCategoryId?: string
    measureUnitId?: string
    quantityStr: string
    unitPriceStr: string
    amountMaterialStr: string
    amountLaborStr: string
    amountEquipmentStr: string
}

export function appendOptionalBudgetNumericFields(
    body: Record<string, unknown>,
    values: FormValuesBase,
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

export function appendOptionalYieldComponents(args: {
    body: Record<string, unknown>
    includeYieldSetup: boolean
    yieldLines: ItemYieldLineInput[]
}): void {
    if (!args.includeYieldSetup) {
        return
    }
    args.body.yieldComponents = {
        linkedItems: [],
        lines: args.yieldLines,
    }
}

export function buildOptionalParameterValues(args: {
    params: BudgetLineParameterConfigRow[]
    valuesByParameterId: Record<string, string>
}): BudgetLineParameterValueInput[] {
    function toOptionalParameterValue(
        param: BudgetLineParameterConfigRow,
        trimmed: string
    ): BudgetLineParameterValueInput | null {
        if (param.valueType === 'BOOLEAN') {
            if (trimmed !== 'true' && trimmed !== 'false') {
                return null
            }
            return {
                parameterDefinitionId: param.parameterDefinitionId,
                valueType: 'BOOLEAN',
                booleanValue: trimmed === 'true',
            }
        }
        if (param.valueType === 'INTEGER') {
            const integerValue = Number.parseInt(trimmed, 10)
            if (!Number.isFinite(integerValue)) {
                return null
            }
            return {
                parameterDefinitionId: param.parameterDefinitionId,
                valueType: 'INTEGER',
                integerValue,
            }
        }
        if (param.valueType === 'DECIMAL') {
            const decimalValue = Number(trimmed)
            if (!Number.isFinite(decimalValue)) {
                return null
            }
            return {
                parameterDefinitionId: param.parameterDefinitionId,
                valueType: 'DECIMAL',
                decimalValue,
            }
        }
        return {
            parameterDefinitionId: param.parameterDefinitionId,
            valueType: 'TEXT',
            textValue: trimmed,
        }
    }

    const rows: BudgetLineParameterValueInput[] = []
    for (const param of args.params) {
        const raw = args.valuesByParameterId[param.parameterDefinitionId]
        const trimmed = raw?.trim() ?? ''
        if (trimmed === '') {
            continue
        }
        const row = toOptionalParameterValue(param, trimmed)
        if (row == null) {
            continue
        }
        rows.push(row)
    }
    return rows
}

export function buildBudgetLineCreateBody(
    values: FormValuesBase,
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

export function ensureManualWorkCategoryForSubmit(args: {
    submitted: FormValuesBase
    libraryBinding: LibraryBinding
    categories: WorkCategoryRow[]
    workCategoryNoneValue: string
    setWorkCategory: (value: string) => void
}): FormValuesBase | null {
    if (args.libraryBinding != null) {
        return args.submitted
    }
    if (args.submitted.workCategoryId !== args.workCategoryNoneValue) {
        return args.submitted
    }
    const fallback = args.categories[0]?.id
    if (!fallback) {
        return null
    }
    args.setWorkCategory(fallback)
    return {
        ...args.submitted,
        workCategoryId: fallback,
    }
}

export function toLibraryBindingFromSuggestion(
    row: SuggestionRow
): LibraryBinding {
    if (row.kind === 'yield') {
        return {
            kind: 'yield',
            yieldId: row.yieldId,
            itemTypeStableId: row.itemTypeStableId,
            workCategoryName: row.workCategoryName,
            measureUnitId: row.measureUnitId,
            measureUnitName: row.measureUnitName,
        }
    }
    return {
        kind: 'catalog',
        catalogItemId: row.catalogItemId,
        itemTypeStableId: row.itemTypeStableId,
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
    if (!args.showSuggestions && args.rows.length === 0) {
        args.setSuggestionsOpen(false)
        return true
    }
    args.event.preventDefault()
    args.setSuggestionsOpen(false)
    args.setActiveSuggestionIndex(NO_ACTIVE_SUGGESTION_INDEX)
    return true
}

export function handleDescriptionSuggestionKey(args: {
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
    if (!args.showSuggestions || args.rows.length === 0) {
        return
    }
    if (args.event.key === 'ArrowDown') {
        args.event.preventDefault()
        args.setActiveSuggestionIndex((i) => {
            if (i < 0) return 0
            return i < args.rows.length - 1 ? i + 1 : i
        })
        return
    }
    if (args.event.key === 'ArrowUp') {
        args.event.preventDefault()
        args.setActiveSuggestionIndex((i) =>
            i > 0 ? i - 1 : NO_ACTIVE_SUGGESTION_INDEX
        )
        return
    }
    if (args.event.key !== 'Enter' || args.activeSuggestionIndex < 0) {
        return
    }
    const activeRow = args.rows[args.activeSuggestionIndex]
    if (!activeRow) {
        return
    }
    args.event.preventDefault()
    args.onPick(activeRow)
}

export function filterUnusedSuggestions(args: {
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

export function shouldShowSuggestionPanel(args: {
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

export function openSuggestionsWhenFreeLine(args: {
    libraryBinding: LibraryBinding
    setSuggestionsOpen: (open: boolean) => void
}): void {
    if (args.libraryBinding != null) {
        return
    }
    args.setSuggestionsOpen(true)
}

export function onDescriptionInputChange(args: {
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

export function workCategoryFromSuggestion(row: SuggestionRow): string {
    return row.kind === 'yield' ? WORK_CATEGORY_NONE : row.workCategoryId
}

export function resetDialogForm(args: {
    form: UseFormReturn<FormValuesBase>
    defaultForm: FormValuesBase
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

export function renderCreateBudgetLineTrigger(args: {
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
