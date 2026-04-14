import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import {
    type BudgetLineCreateFormValues,
    CreateBudgetLineDialogFormFields,
} from '@/components/create-budget-line-dialog-form-fields'

const BASE_VALUES: BudgetLineCreateFormValues = {
    description: '',
    workCategoryId: '__none__',
    measureUnitId: '__none__',
    quantityStr: '',
    unitPriceStr: '',
    amountMaterialStr: '',
    amountLaborStr: '',
    amountEquipmentStr: '',
}

function FormFieldsHarness({ pricingLockedByYield = false } = {}) {
    const form = useForm<BudgetLineCreateFormValues>({
        defaultValues: BASE_VALUES,
    })

    return (
        <CreateBudgetLineDialogFormFields
            form={form}
            values={BASE_VALUES}
            libraryBinding={null}
            categories={[]}
            categoriesLoading={false}
            measureUnits={[]}
            measureUnitsLoading={false}
            workCategoryNoneValue="__none__"
            unitNone="__none__"
            showSuggestions={false}
            suggestionsLoading={false}
            filteredSuggestionRows={[]}
            suggestionListboxId="test-listbox"
            activeSuggestionIndex={-1}
            setActiveSuggestionIndex={() => {}}
            onDescriptionKeyDown={() => {}}
            onDescriptionFocus={() => {}}
            onDescriptionBlur={() => {}}
            onDescriptionInput={() => {}}
            onClearLibraryBinding={() => {}}
            handleSuggestionPick={() => {}}
            isBreakdownActive={false}
            pricingLockedByYield={pricingLockedByYield}
            bottomSection={
                <div data-testid="yield-bottom">Yield bottom slot</div>
            }
        />
    )
}

describe('CreateBudgetLineDialogFormFields', () => {
    it('renders bottomSection after pricing and breakdown section', () => {
        render(<FormFieldsHarness />)

        const breakdownLabel = screen.getByText(
            'Desglose por categoría (opcional, por unidad)'
        )
        const bottomSection = screen.getByTestId('yield-bottom')

        expect(bottomSection).toBeInTheDocument()
        expect(
            breakdownLabel.compareDocumentPosition(bottomSection) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy()
    })

    it('disables pricing inputs when pricing is locked by yield', () => {
        render(<FormFieldsHarness pricingLockedByYield />)
        fireEvent.click(
            screen.getByText('Desglose por categoría (opcional, por unidad)')
        )

        expect(
            screen.getByLabelText('P. unitario (ARS / unidad)')
        ).toBeDisabled()
        expect(
            screen.getByLabelText('Materiales (ARS / unidad)')
        ).toBeDisabled()
        expect(
            screen.getByLabelText('Mano de obra (ARS / unidad)')
        ).toBeDisabled()
        expect(screen.getByLabelText('Equipo (ARS / unidad)')).toBeDisabled()
    })
})
