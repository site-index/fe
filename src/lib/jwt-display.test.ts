import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isAccessTokenExpired, parseAccessTokenEmail } from './jwt-display'

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

function payloadB64(payload: object): string {
    const json = JSON.stringify(payload)
    const b64 = btoa(json)
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function jwtWithPayload(payload: object): string {
    return `e30.${payloadB64(payload)}.sig`
}

describe('isAccessTokenExpired', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'))
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns false when there is no token', () => {
        expect(isAccessTokenExpired(null)).toBe(false)
        expect(isAccessTokenExpired('')).toBe(false)
    })

    it('returns true when exp is missing', () => {
        expect(isAccessTokenExpired(SAMPLE_TOKEN)).toBe(true)
    })

    it('returns false when exp is in the future beyond skew', () => {
        const exp = Math.floor(Date.now() / 1000) + 3600
        expect(isAccessTokenExpired(jwtWithPayload({ exp }))).toBe(false)
    })

    it('returns true when exp is in the past', () => {
        const exp = Math.floor(Date.now() / 1000) - 60
        expect(isAccessTokenExpired(jwtWithPayload({ exp }))).toBe(true)
    })
})
