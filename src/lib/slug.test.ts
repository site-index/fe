import { describe, expect, it } from 'vitest'

import { toSlug } from './slug'

describe('toSlug', () => {
    it('trims and lowercases', () => {
        expect(toSlug('  Acme Studio  ')).toBe('acme-studio')
    })

    it('strips combining marks (accents)', () => {
        expect(toSlug('Café Arquitectura')).toBe('cafe-arquitectura')
    })

    it('replaces non-alphanumeric runs with single hyphen', () => {
        expect(toSlug('foo   bar___baz')).toBe('foo-bar-baz')
    })

    it('removes leading and trailing hyphens', () => {
        expect(toSlug('---hello---')).toBe('hello')
    })

    it('returns empty string for whitespace-only input', () => {
        expect(toSlug('   \t  ')).toBe('')
    })
})
