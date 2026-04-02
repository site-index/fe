import type { KeyboardEvent } from 'react'
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
    libraryBinding: LibraryBinding
    categories: WorkCategoryRow[]
    categoriesLoading: boolean
    measureUnits: MeasureUnitRow[]
    measureUnitsLoading: boolean
    rubroNone: string
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
}

function RubroSection({
    libraryBinding,
    categories,
    categoriesLoading,
    rubroNone,
    value,
    onChange,
    error,
}: {
    libraryBinding: LibraryBinding
    categories: WorkCategoryRow[]
    categoriesLoading: boolean
    rubroNone: string
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
                <p className="text-xs text-muted-foreground">
                    Lo define el rendimiento vinculado a la biblioteca.
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
                <option value={rubroNone}>Sin rubro</option>
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
}: {
    libraryBinding: LibraryBinding
    measureUnits: MeasureUnitRow[]
    measureUnitsLoading: boolean
    unitNone: string
    value: string
    onChange: (value: string) => void
    error?: string
}) {
    if (libraryBinding != null) {
        if (libraryBinding.measureUnitId != null) {
            const displayName =
                libraryBinding.measureUnitName ??
                measureUnits.find((u) => u.id === value)?.name ??
                '—'
            return (
                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Unidad (opcional)
                    </label>
                    <p
                        id="create-budget-line-measure-unit-locked"
                        className="text-sm font-medium rounded-md border border-input bg-muted/40 px-3 py-2"
                    >
                        {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {libraryBinding.kind === 'yield'
                            ? 'La define el rendimiento vinculado a la biblioteca.'
                            : 'La define el ítem del catálogo.'}
                    </p>
                    {error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : null}
                </div>
            )
        }

        return (
            <div className="space-y-2">
                <label className="text-sm font-medium">Unidad (opcional)</label>
                <p className="text-sm font-medium rounded-md border border-input bg-muted/40 px-3 py-2">
                    Sin unidad
                </p>
                <p className="text-xs text-muted-foreground">
                    {libraryBinding.kind === 'yield'
                        ? 'La define el rendimiento vinculado a la biblioteca.'
                        : 'La define el ítem del catálogo.'}
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <label
                htmlFor="create-budget-line-measure-unit"
                className="text-sm font-medium"
            >
                Unidad (opcional)
            </label>
            <select
                id="create-budget-line-measure-unit"
                aria-label="Unidad"
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
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
    )
}

// eslint-disable-next-line complexity
export function CreateBudgetLineDialogFormFields({
    form,
    values,
    libraryBinding,
    categories,
    categoriesLoading,
    measureUnits,
    measureUnitsLoading,
    rubroNone,
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
}: Props) {
    const activeRow = filteredSuggestionRows[activeSuggestionIndex]
    const activeDescendant =
        showSuggestions && activeRow
            ? `${suggestionListboxId}-option-${budgetLineSuggestionRowKey(activeRow)}`
            : undefined

    const descField = form.register('description')
    return (
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
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
                        placeholder="Ej. Hormigón H21 — losa"
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
                    <p className="text-sm text-destructive">
                        {form.formState.errors.description.message}
                    </p>
                ) : null}
                {suggestionsLoading && showSuggestions ? (
                    <p className="text-xs text-muted-foreground">
                        Cargando sugerencias…
                    </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                    Si no existe un catalog item con ese nombre, se propone uno
                    nuevo en estado pendiente de aprobación.
                </p>
            </div>

            <RubroSection
                libraryBinding={libraryBinding}
                categories={categories}
                categoriesLoading={categoriesLoading}
                rubroNone={rubroNone}
                value={values.workCategoryId}
                onChange={(v) =>
                    form.setValue('workCategoryId', v, { shouldValidate: true })
                }
                error={form.formState.errors.workCategoryId?.message}
            />
            <MeasureUnitSection
                libraryBinding={libraryBinding}
                measureUnits={measureUnits}
                measureUnitsLoading={measureUnitsLoading}
                unitNone={unitNone}
                value={values.measureUnitId}
                onChange={(v) =>
                    form.setValue('measureUnitId', v, { shouldValidate: true })
                }
                error={form.formState.errors.measureUnitId?.message}
            />

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label
                        htmlFor="create-budget-line-quantity"
                        className="text-sm font-medium"
                    >
                        Cantidad
                    </label>
                    <Input
                        id="create-budget-line-quantity"
                        inputMode="decimal"
                        placeholder="—"
                        {...form.register('quantityStr')}
                    />
                    {form.formState.errors.quantityStr ? (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.quantityStr.message}
                        </p>
                    ) : null}
                </div>
                <div className="space-y-2">
                    <label
                        htmlFor="create-budget-line-unit-price"
                        className="text-sm font-medium"
                    >
                        P. unitario (ARS / unidad)
                    </label>
                    <Input
                        id="create-budget-line-unit-price"
                        inputMode="decimal"
                        placeholder="—"
                        {...form.register('unitPriceStr')}
                    />
                    {form.formState.errors.unitPriceStr ? (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.unitPriceStr.message}
                        </p>
                    ) : null}
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
                        <div className="space-y-2">
                            <label
                                htmlFor="create-budget-line-amount-material"
                                className="text-sm font-medium"
                            >
                                Materiales (ARS / unidad)
                            </label>
                            <Input
                                id="create-budget-line-amount-material"
                                inputMode="decimal"
                                placeholder="0"
                                {...form.register('amountMaterialStr')}
                            />
                            {form.formState.errors.amountMaterialStr ? (
                                <p className="text-sm text-destructive">
                                    {
                                        form.formState.errors.amountMaterialStr
                                            .message
                                    }
                                </p>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="create-budget-line-amount-labor"
                                className="text-sm font-medium"
                            >
                                Mano de obra (ARS / unidad)
                            </label>
                            <Input
                                id="create-budget-line-amount-labor"
                                inputMode="decimal"
                                placeholder="0"
                                {...form.register('amountLaborStr')}
                            />
                            {form.formState.errors.amountLaborStr ? (
                                <p className="text-sm text-destructive">
                                    {
                                        form.formState.errors.amountLaborStr
                                            .message
                                    }
                                </p>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="create-budget-line-amount-equipment"
                                className="text-sm font-medium"
                            >
                                Equipo (ARS / unidad)
                            </label>
                            <Input
                                id="create-budget-line-amount-equipment"
                                inputMode="decimal"
                                placeholder="0"
                                {...form.register('amountEquipmentStr')}
                            />
                            {form.formState.errors.amountEquipmentStr ? (
                                <p className="text-sm text-destructive">
                                    {
                                        form.formState.errors.amountEquipmentStr
                                            .message
                                    }
                                </p>
                            ) : null}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}
