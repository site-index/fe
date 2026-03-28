import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiFetch, getApiErrorMessage, getHealthUrl } from './api'

describe('getApiErrorMessage', () => {
    it('reads string message from ApiError body', () => {
        const err = new ApiError(400, { message: 'Bad request' })
        expect(getApiErrorMessage(err)).toBe('Bad request')
    })

    it('joins array message from ApiError body', () => {
        const err = new ApiError(422, { message: ['a', 'b'] })
        expect(getApiErrorMessage(err)).toBe('a, b')
    })

    it('falls back to Error message when ApiError body has no message', () => {
        const err = new ApiError(500, {})
        expect(getApiErrorMessage(err)).toBe('HTTP 500')
    })

    it('handles generic Error', () => {
        expect(getApiErrorMessage(new Error('oops'))).toBe('oops')
    })

    it('handles unknown', () => {
        expect(getApiErrorMessage(null)).toBe('Unknown error')
    })
})

describe('apiFetch', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
    })

    it('GETs JSON and returns parsed body', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{"x":1}'),
            })
        )
        vi.stubEnv('VITE_API_URL', '')

        const data = await apiFetch<{ x: number }>('/foo')
        expect(data).toEqual({ x: 1 })
        expect(fetch).toHaveBeenCalledWith(
            '/api/foo',
            expect.objectContaining({ method: 'GET' })
        )
    })

    it('uses VITE_API_URL as full API origin (strips trailing slash)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{}'),
            })
        )
        vi.stubEnv('VITE_API_URL', 'http://localhost:3000/')

        await apiFetch('bar')
        expect(fetch).toHaveBeenCalledWith(
            'http://localhost:3000/bar',
            expect.anything()
        )
    })

    it('returns undefined for 204', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 204,
                text: () => Promise.resolve(''),
            })
        )
        vi.stubEnv('VITE_API_URL', '')

        const data = await apiFetch<void>('/x')
        expect(data).toBeUndefined()
    })

    it('throws ApiError on non-OK with JSON body', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: () => Promise.resolve({ message: 'missing' }),
            })
        )
        vi.stubEnv('VITE_API_URL', '')

        await expect(apiFetch('/nope')).rejects.toMatchObject({
            name: 'ApiError',
            status: 404,
            body: { message: 'missing' },
        })
    })

    it('sends Authorization and X-Studio-Slug when provided', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: () => Promise.resolve('null'),
            })
        )
        vi.stubEnv('VITE_API_URL', '')

        await apiFetch('/p', {
            token: 'tok',
            studioSlug: 'acme',
            body: { a: 1 },
        })
        expect(fetch).toHaveBeenCalledWith(
            '/api/p',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer tok',
                    'X-Studio-Slug': 'acme',
                }),
                body: '{"a":1}',
            })
        )
    })
})

describe('getHealthUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('prefixes /api/health when VITE_API_URL is empty', () => {
        vi.stubEnv('VITE_API_URL', '')
        expect(getHealthUrl()).toBe('/api/health')
    })

    it('uses absolute base when VITE_API_URL is set', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com')
        expect(getHealthUrl()).toBe('https://api.example.com/health')
    })
})
