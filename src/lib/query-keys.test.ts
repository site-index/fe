import { describe, expect, it } from 'vitest'

import { qk } from '@/lib/query-keys'

describe('qk', () => {
    it('scopes tenant-wide keys by normalized studio slug', () => {
        expect(qk.projects('Acme')).toEqual(['studio', 'acme', 'projects'])
        expect(qk.projects('acme')).toEqual(['studio', 'acme', 'projects'])
    })

    it('separates project keys by studio scope', () => {
        expect(qk.budgetLines('acme', 'project-1')).not.toEqual(
            qk.budgetLines('other', 'project-1')
        )
    })

    it('uses fallback scope when studio slug is missing', () => {
        expect(qk.resources('')).toEqual([
            'studio',
            '__studio_unknown__',
            'resources',
        ])
    })
})
