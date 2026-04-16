import { describe, expect, it } from 'vitest'

import {
    appendOptionalYieldComponents,
    buildOptionalParameterValues,
} from '@/components/create-budget-line-dialog.helpers'

describe('appendOptionalYieldComponents', () => {
    it('does not append payload when setup is disabled', () => {
        const body: Record<string, unknown> = { description: 'Linea' }
        appendOptionalYieldComponents({
            body,
            includeYieldSetup: false,
            yieldLines: [
                {
                    resourceId: 'res-1',
                    quantity: 1,
                    billingMode: 'QUANTITY',
                },
            ],
        })

        expect(body).toEqual({ description: 'Linea' })
    })

    it('appends yieldComponents with linkedItems and lines when enabled', () => {
        const body: Record<string, unknown> = { description: 'Linea' }
        const yieldLines = [
            {
                resourceId: 'res-1',
                quantity: 1.25,
                billingMode: 'QUANTITY' as const,
            },
        ]

        appendOptionalYieldComponents({
            body,
            includeYieldSetup: true,
            yieldLines,
        })

        expect(body).toEqual({
            description: 'Linea',
            yieldComponents: {
                linkedItems: [],
                lines: yieldLines,
            },
        })
    })
})

describe('buildOptionalParameterValues', () => {
    it('returns only filled and valid typed values', () => {
        const rows = buildOptionalParameterValues({
            params: [
                {
                    parameterDefinitionId: 'decimal-1',
                    key: 'areaM2',
                    label: 'm²',
                    valueType: 'DECIMAL',
                    enabled: true,
                    isRequired: true,
                    isCertificationDriver: false,
                    isBudgetPrimaryDriver: true,
                    isBudgetFormulaInput: true,
                    sortOrder: 10,
                },
                {
                    parameterDefinitionId: 'integer-1',
                    key: 'count',
                    label: 'Recuento',
                    valueType: 'INTEGER',
                    enabled: true,
                    isRequired: false,
                    isCertificationDriver: false,
                    isBudgetPrimaryDriver: false,
                    isBudgetFormulaInput: true,
                    sortOrder: 20,
                },
                {
                    parameterDefinitionId: 'boolean-1',
                    key: 'flag',
                    label: 'Bandera',
                    valueType: 'BOOLEAN',
                    enabled: true,
                    isRequired: false,
                    isCertificationDriver: false,
                    isBudgetPrimaryDriver: false,
                    isBudgetFormulaInput: true,
                    sortOrder: 30,
                },
                {
                    parameterDefinitionId: 'text-1',
                    key: 'note',
                    label: 'Nota',
                    valueType: 'TEXT',
                    enabled: true,
                    isRequired: false,
                    isCertificationDriver: false,
                    isBudgetPrimaryDriver: false,
                    isBudgetFormulaInput: true,
                    sortOrder: 40,
                },
            ],
            valuesByParameterId: {
                'decimal-1': '12.5',
                'integer-1': '3',
                'boolean-1': 'true',
                'text-1': ' texto ',
            },
        })

        expect(rows).toEqual([
            {
                parameterDefinitionId: 'decimal-1',
                valueType: 'DECIMAL',
                decimalValue: 12.5,
            },
            {
                parameterDefinitionId: 'integer-1',
                valueType: 'INTEGER',
                integerValue: 3,
            },
            {
                parameterDefinitionId: 'boolean-1',
                valueType: 'BOOLEAN',
                booleanValue: true,
            },
            {
                parameterDefinitionId: 'text-1',
                valueType: 'TEXT',
                textValue: 'texto',
            },
        ])
    })

    it('drops empty and invalid numeric values', () => {
        const rows = buildOptionalParameterValues({
            params: [
                {
                    parameterDefinitionId: 'decimal-1',
                    key: 'areaM2',
                    label: 'm²',
                    valueType: 'DECIMAL',
                    enabled: true,
                    isRequired: true,
                    isCertificationDriver: false,
                    isBudgetPrimaryDriver: true,
                    isBudgetFormulaInput: true,
                    sortOrder: 10,
                },
                {
                    parameterDefinitionId: 'integer-1',
                    key: 'count',
                    label: 'Recuento',
                    valueType: 'INTEGER',
                    enabled: true,
                    isRequired: false,
                    isCertificationDriver: false,
                    isBudgetPrimaryDriver: false,
                    isBudgetFormulaInput: true,
                    sortOrder: 20,
                },
            ],
            valuesByParameterId: {
                'decimal-1': 'abc',
                'integer-1': '',
            },
        })

        expect(rows).toEqual([])
    })
})
