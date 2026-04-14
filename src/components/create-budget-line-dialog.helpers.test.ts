import { describe, expect, it } from 'vitest'

import { appendOptionalYieldComponents } from '@/components/create-budget-line-dialog.helpers'

describe('appendOptionalYieldComponents', () => {
    it('does not append payload when setup is disabled', () => {
        const body: Record<string, unknown> = { description: 'Linea' }
        appendOptionalYieldComponents({
            body,
            includeYieldSetup: false,
            yieldLines: [{ resourceId: 'res-1', quantity: 1 }],
        })

        expect(body).toEqual({ description: 'Linea' })
    })

    it('appends yieldComponents with linkedItems and lines when enabled', () => {
        const body: Record<string, unknown> = { description: 'Linea' }
        const yieldLines = [{ resourceId: 'res-1', quantity: 1.25 }]

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
