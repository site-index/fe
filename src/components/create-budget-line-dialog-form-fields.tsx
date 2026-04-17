import type { KeyboardEvent, ReactNode } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { CreateBudgetLineSuggestionPanel } from '@/components/create-budget-line-suggestion-panel'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SuggestionRow } from '@/components/use-budget-line-description-suggestions'
import { budgetLineSuggestionRowKey } from '@/components/use-budget-line-description-suggestions'
import type { MeasureUnitRow } from '@/types/measure-unit'
import type { WorkCategoryRow } from '@/types/work-category'

export type BudgetLineLibraryBinding =
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

export type BudgetLineCreateFormValues = {
    description: string
    workCategoryId: string
    measureUnitId: string
    quantityStr: string
    unitPriceStr: string
    amountMaterialStr: string
    amountLaborStr: string
    amountEquipmentStr: string
}

type Props = {
    form: UseFormReturn<BudgetLineCreateFormValues>
    values: BudgetLineCreateFormValues
    libraryBinding: BudgetLineLibraryBinding
    categories: WorkCategoryRow[]
    categoriesLoading: boolean
    measureUnits: MeasureUnitRow[]
    measureUnitsLoading: boolean
    workCategoryNoneValue: string
    unitNone: string
    showSuggestions: boolean
    suggestionsLoading: boolean
    filteredSuggestionRows: SuggestionRow[]
    suggestionListboxId: string
    activeSuggestionIndex: number
    setActiveSuggestionIndex: (n: number) => void
    onDescriptionKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
    onDescriptionFocus: () => void
    onDescriptionBlur: () => void
    onDescriptionInput: () => void
    onClearLibraryBinding: () => void
    handleSuggestionPick: (row: SuggestionRow) => void
    onQuantityChange?: (value: string) => void
    isBreakdownActive: boolean
    pricingLockedByYield?: boolean
    showCatalogSuggestionHint?: boolean
    hideWorkCategoryField?: boolean
    topSection?: ReactNode
    bottomSection?: ReactNode
}

type DescriptionSectionProps = {
    form: UseFormReturn<BudgetLineCreateFormValues>
    libraryBinding: BudgetLineLibraryBinding
    showSuggestions: boolean
    suggestionListboxId: string
    activeDescendant?: string
    filteredSuggestionRows: SuggestionRow[]
    activeSuggestionIndex: number
    setActiveSuggestionIndex: (n: number) => void
    onDescriptionKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
    onDescriptionFocus: () => void
    onDescriptionBlur: () => void
    onDescriptionInput: () => void
    onClearLibraryBinding: () => void
    handleSuggestionPick: (row: SuggestionRow) => void
    suggestionsLoading: boolean
    showCatalogSuggestionHint: boolean
}

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null
    }
    return <p className="text-sm text-destructive">{message}</p>
}

function measureUnitLabelClassName(centerLabel: boolean) {
    return centerLabel
        ? 'text-sm font-medium block text-center'
        : 'text-sm font-medium'
}

function resolveMeasureUnitDisplayName(args: {
    libraryBinding: BudgetLineLibraryBinding
    measureUnits: MeasureUnitRow[]
    value: string
}) {
    if (args.libraryBinding?.measureUnitName) {
        return args.libraryBinding.measureUnitName
    }
    const selectedMeasureUnit = args.measureUnits.find(
        (unit) => unit.id === args.value
    )
    return selectedMeasureUnit?.name ?? '—'
}

function AmountInputField(args: {
    id: string
    label: string
    register: ReturnType<UseFormReturn<BudgetLineCreateFormValues>['register']>
    error?: string
    disabled?: boolean
}) {
    return (
        <div className="space-y-2">
            <label htmlFor={args.id} className="text-sm font-medium">
                {args.label}
            </label>
            <Input
                id={args.id}
                inputMode="decimal"
                disabled={args.disabled}
                {...args.register}
            />
            <FieldError message={args.error} />
        </div>
    )
}

function WorkCategorySection({
    libraryBinding,
    categories,
    categoriesLoading,
    workCategoryNoneValue,
    value,
    onChange,
    error,
}: {
    libraryBinding: BudgetLineLibraryBinding
    categories: WorkCategoryRow[]
    categoriesLoading: boolean
    workCategoryNoneValue: string
    value: string
    onChange: (value: string) => void
    error?: string
}) {
    if (libraryBinding?.kind === 'yield') {
        return (
            <div className="space-y-2">
                <label className="text-sm font-medium">Rubro</label>
                <p className="text-sm font-medium rounded-md border border-input bg-muted/40 px-3 py-2">
                    {libraryBinding.workCategoryName}
                </p>
            </div>
        )
    }
    return (
        <div className="space-y-2">
            <label
                htmlFor="create-budget-line-work-category"
                className="text-sm font-medium"
            >
                Rubro (opcional)
            </label>
            <select
                id="create-budget-line-work-category"
                aria-label="Rubro"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                value={value}
                disabled={
                    categoriesLoading || libraryBinding?.kind === 'catalog'
                }
                onChange={(e) => onChange(e.target.value)}
            >
                <option value={workCategoryNoneValue}>Sin rubro</option>
                {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name}
                    </option>
                ))}
            </select>
            {libraryBinding?.kind === 'catalog' ? (
                <p className="text-xs text-muted-foreground">
                    Rubro fijado por el ítem del catálogo.
                </p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
    )
}

function MeasureUnitSection({
    libraryBinding,
    measureUnits,
    measureUnitsLoading,
    unitNone,
    value,
    onChange,
    error,
    label = 'Unidad (opcional)',
    centerLabel = false,
}: {
    libraryBinding: BudgetLineLibraryBinding
    measureUnits: MeasureUnitRow[]
    measureUnitsLoading: boolean
    unitNone: string
    value: string
    onChange: (value: string) => void
    error?: string
    label?: string
    centerLabel?: boolean
}) {
    const labelClassName = measureUnitLabelClassName(centerLabel)

    if (libraryBinding?.measureUnitId != null) {
        const displayName = resolveMeasureUnitDisplayName({
            libraryBinding,
            measureUnits,
            value,
        })
        return (
            <div className="space-y-2">
                <label className={labelClassName}>{label}</label>
                <p
                    id="create-budget-line-measure-unit-locked"
                    className="text-sm font-medium rounded-md border border-input bg-muted/40 px-3 py-2"
                >
                    {displayName}
                </p>
                <FieldError message={error} />
            </div>
        )
    }
    if (libraryBinding != null) {
        return (
            <div className="space-y-2">
                <label className={labelClassName}>{label}</label>
                <p className="text-sm font-medium rounded-md border border-input bg-muted/40 px-3 py-2">
                    Sin unidad
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <label
                htmlFor="create-budget-line-measure-unit"
                className={labelClassName}
            >
                {label}
            </label>
            <select
                id="create-budget-line-measure-unit"
                aria-label={label}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                value={value}
                disabled={measureUnitsLoading}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value={unitNone}>Sin unidad</option>
                {measureUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                        {u.name}
                    </option>
                ))}
            </select>
            <FieldError message={error} />
        </div>
    )
}

function DescriptionSection({
    form,
    libraryBinding,
    showSuggestions,
    suggestionListboxId,
    activeDescendant,
    filteredSuggestionRows,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    onDescriptionKeyDown,
    onDescriptionFocus,
    onDescriptionBlur,
    onDescriptionInput,
    onClearLibraryBinding,
    handleSuggestionPick,
    suggestionsLoading,
}: DescriptionSectionProps) {
    const descField = form.register('description')
    return (
        <div className="space-y-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <label
                    htmlFor="create-budget-line-description"
                    className="text-sm font-medium"
                >
                    Descripción
                </label>
                {libraryBinding ? (
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs text-muted-foreground sm:text-sm"
                        onClick={onClearLibraryBinding}
                    >
                        Escribir como línea libre
                    </Button>
                ) : null}
            </div>
            <div className="relative">
                <Input
                    id="create-budget-line-description"
                    autoComplete="off"
                    readOnly={libraryBinding != null}
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions}
                    aria-controls={
                        showSuggestions ? suggestionListboxId : undefined
                    }
                    aria-activedescendant={activeDescendant}
                    {...descField}
                    onBlur={(event) => {
                        descField.onBlur(event)
                        onDescriptionBlur()
                    }}
                    onFocus={() => {
                        onDescriptionFocus()
                    }}
                    onClick={() => {
                        onDescriptionFocus()
                    }}
                    onKeyDown={onDescriptionKeyDown}
                    onChange={(event) => {
                        descField.onChange(event)
                        form.setValue('description', event.target.value, {
                            shouldValidate: true,
                        })
                        onDescriptionInput()
                    }}
                />
                {showSuggestions ? (
                    <div className="absolute top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                        <CreateBudgetLineSuggestionPanel
                            listboxId={suggestionListboxId}
                            rows={filteredSuggestionRows}
                            activeIndex={activeSuggestionIndex}
                            onActiveIndexChange={setActiveSuggestionIndex}
                            onPick={handleSuggestionPick}
                        />
                    </div>
                ) : null}
            </div>
            {form.formState.errors.description ? (
                <FieldError
                    message={form.formState.errors.description.message}
                />
            ) : null}
            {suggestionsLoading && showSuggestions ? (
                <p className="text-xs text-muted-foreground">
                    Cargando sugerencias…
                </p>
            ) : null}
        </div>
    )
}

function PricingAndBreakdownSection(args: {
    form: UseFormReturn<BudgetLineCreateFormValues>
    libraryBinding: BudgetLineLibraryBinding
    measureUnits: MeasureUnitRow[]
    measureUnitsLoading: boolean
    unitNone: string
    measureUnitId: string
    onMeasureUnitChange: (value: string) => void
    onQuantityChange?: (value: string) => void
    measureUnitError?: string
    isBreakdownActive: boolean
    pricingLockedByYield: boolean
}) {
    return (
        <>
            <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                    <label
                        htmlFor="create-budget-line-quantity"
                        className="block text-center text-sm font-medium"
                    >
                        Q
                    </label>
                    <Input
                        id="create-budget-line-quantity"
                        inputMode="decimal"
                        {...args.form.register('quantityStr', {
                            onChange: (event) => {
                                args.onQuantityChange?.(event.target.value)
                            },
                        })}
                    />
                    <FieldError
                        message={
                            args.form.formState.errors.quantityStr?.message
                        }
                    />
                </div>
                <MeasureUnitSection
                    libraryBinding={args.libraryBinding}
                    measureUnits={args.measureUnits}
                    measureUnitsLoading={args.measureUnitsLoading}
                    unitNone={args.unitNone}
                    value={args.measureUnitId}
                    onChange={args.onMeasureUnitChange}
                    error={args.measureUnitError}
                    label="U"
                    centerLabel
                />
                <div className="space-y-2">
                    <label
                        htmlFor="create-budget-line-unit-price"
                        className="block text-center text-sm font-medium"
                    >
                        PU
                    </label>
                    <Input
                        id="create-budget-line-unit-price"
                        inputMode="decimal"
                        disabled={
                            args.isBreakdownActive || args.pricingLockedByYield
                        }
                        {...args.form.register('unitPriceStr')}
                    />
                    <FieldError
                        message={
                            args.form.formState.errors.unitPriceStr?.message
                        }
                    />
                </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="categoryAmounts" className="border-b-0">
                    <AccordionTrigger className="py-2 text-sm">
                        Desglose por categoría (opcional, por unidad)
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-1">
                        <p className="text-xs text-muted-foreground">
                            Importes en ARS por cada unidad de medida de la
                            línea (no el total de la obra).
                        </p>
                        <AmountInputField
                            id="create-budget-line-amount-material"
                            label="Materiales (ARS / unidad)"
                            register={args.form.register('amountMaterialStr')}
                            disabled={args.pricingLockedByYield}
                            error={
                                args.form.formState.errors.amountMaterialStr
                                    ?.message
                            }
                        />
                        <AmountInputField
                            id="create-budget-line-amount-labor"
                            label="Mano de obra (ARS / unidad)"
                            register={args.form.register('amountLaborStr')}
                            disabled={args.pricingLockedByYield}
                            error={
                                args.form.formState.errors.amountLaborStr
                                    ?.message
                            }
                        />
                        <AmountInputField
                            id="create-budget-line-amount-equipment"
                            label="Equipo (ARS / unidad)"
                            register={args.form.register('amountEquipmentStr')}
                            disabled={args.pricingLockedByYield}
                            error={
                                args.form.formState.errors.amountEquipmentStr
                                    ?.message
                            }
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </>
    )
}

export function CreateBudgetLineDialogFormFields({
    form,
    values,
    libraryBinding,
    categories,
    categoriesLoading,
    measureUnits,
    measureUnitsLoading,
    workCategoryNoneValue,
    unitNone,
    showSuggestions,
    suggestionsLoading,
    filteredSuggestionRows,
    suggestionListboxId,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    onDescriptionKeyDown,
    onDescriptionFocus,
    onDescriptionBlur,
    onDescriptionInput,
    onClearLibraryBinding,
    handleSuggestionPick,
    onQuantityChange,
    isBreakdownActive,
    pricingLockedByYield = false,
    showCatalogSuggestionHint = true,
    hideWorkCategoryField = false,
    topSection,
    bottomSection,
}: Props) {
    const activeRow = filteredSuggestionRows[activeSuggestionIndex]
    const activeDescendant =
        showSuggestions && activeRow
            ? `${suggestionListboxId}-option-${budgetLineSuggestionRowKey(activeRow)}`
            : undefined

    return (
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
            {hideWorkCategoryField ? null : (
                <WorkCategorySection
                    libraryBinding={libraryBinding}
                    categories={categories}
                    categoriesLoading={categoriesLoading}
                    workCategoryNoneValue={workCategoryNoneValue}
                    value={values.workCategoryId}
                    onChange={(v) =>
                        form.setValue('workCategoryId', v, {
                            shouldValidate: true,
                        })
                    }
                    error={form.formState.errors.workCategoryId?.message}
                />
            )}
            <DescriptionSection
                form={form}
                libraryBinding={libraryBinding}
                showSuggestions={showSuggestions}
                suggestionListboxId={suggestionListboxId}
                activeDescendant={activeDescendant}
                filteredSuggestionRows={filteredSuggestionRows}
                activeSuggestionIndex={activeSuggestionIndex}
                setActiveSuggestionIndex={setActiveSuggestionIndex}
                onDescriptionKeyDown={onDescriptionKeyDown}
                onDescriptionFocus={onDescriptionFocus}
                onDescriptionBlur={onDescriptionBlur}
                onDescriptionInput={onDescriptionInput}
                onClearLibraryBinding={onClearLibraryBinding}
                handleSuggestionPick={handleSuggestionPick}
                suggestionsLoading={suggestionsLoading}
                showCatalogSuggestionHint={showCatalogSuggestionHint}
            />
            {topSection}
            <PricingAndBreakdownSection
                form={form}
                libraryBinding={libraryBinding}
                measureUnits={measureUnits}
                measureUnitsLoading={measureUnitsLoading}
                unitNone={unitNone}
                measureUnitId={values.measureUnitId}
                onMeasureUnitChange={(v) =>
                    form.setValue('measureUnitId', v, { shouldValidate: true })
                }
                onQuantityChange={onQuantityChange}
                measureUnitError={form.formState.errors.measureUnitId?.message}
                isBreakdownActive={isBreakdownActive}
                pricingLockedByYield={pricingLockedByYield}
            />
            {bottomSection}
        </div>
    )
}
