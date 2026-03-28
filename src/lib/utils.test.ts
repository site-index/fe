import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
    it('merges conflicting tailwind utilities via twMerge', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4')
    })

    it('combines non-conflicting classes', () => {
        expect(cn('p-2', 'text-lg')).toMatch(/p-2/)
        expect(cn('p-2', 'text-lg')).toMatch(/text-lg/)
    })
})
