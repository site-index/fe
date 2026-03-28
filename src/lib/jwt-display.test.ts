import { describe, expect, it } from 'vitest'

import { parseAccessTokenEmail } from './jwt-display'

/** Minimal JWT: header . payload . sig; payload = {"email":"user@example.com"} */
const SAMPLE_TOKEN = 'e30.' + 'eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ' + '.sig'

describe('parseAccessTokenEmail', () => {
    it('returns null for null or empty', () => {
        expect(parseAccessTokenEmail(null)).toBeNull()
        expect(parseAccessTokenEmail('')).toBeNull()
    })

    it('returns null for malformed token', () => {
        expect(parseAccessTokenEmail('not-a-jwt')).toBeNull()
        expect(parseAccessTokenEmail('a.b')).toBeNull()
    })

    it('extracts email from valid payload', () => {
        expect(parseAccessTokenEmail(SAMPLE_TOKEN)).toBe('user@example.com')
    })
})
