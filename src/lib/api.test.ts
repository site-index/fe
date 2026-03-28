import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    ApiError,
    apiFetch,
    getApiErrorMessage,
    getHealthUrl,
    registerSessionInvalidatedHandler,
} from './api'

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
            expect.objectContaining({
                method: 'GET',
                credentials: 'include',
            })
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
            expect.objectContaining({ credentials: 'include' })
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
                credentials: 'include',
                headers: expect.objectContaining({
                    Authorization: 'Bearer tok',
                    'X-Studio-Slug': 'acme',
                }),
                body: '{"a":1}',
            })
        )
    })

    it('retries once after 401 when refresh returns a new access token', async () => {
        vi.stubEnv('VITE_API_URL', '')
        const okBody = {
            ok: true,
            status: 200,
            text: () => Promise.resolve('{"ok":true}'),
        }
        const unauthorized = {
            ok: false,
            status: 401,
            text: async () => '',
            json: async () => ({}),
        }
        const refreshOk = {
            ok: true,
            status: 200,
            text: () => Promise.resolve('{"accessToken":"fresh"}'),
            json: () => Promise.resolve({ accessToken: 'fresh' }),
        }
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce(unauthorized)
                .mockResolvedValueOnce(refreshOk)
                .mockResolvedValueOnce(okBody)
        )

        const data = await apiFetch<{ ok: boolean }>('/r', { token: 'stale' })
        expect(data).toEqual({ ok: true })
        expect(fetch).toHaveBeenCalledTimes(3)
        expect(fetch).toHaveBeenNthCalledWith(
            2,
            '/api/v1/auth/refresh',
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
            })
        )
    })

    it('calls session invalidation handler when 401 and refresh fails', async () => {
        vi.stubEnv('VITE_API_URL', '')
        const unauthorized = {
            ok: false,
            status: 401,
            text: async () => '{"message":"nope"}',
            json: async () => ({ message: 'nope' }),
        }
        const refreshFail = {
            ok: false,
            status: 401,
            text: async () => '',
            json: async () => ({}),
        }
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce(unauthorized)
                .mockResolvedValueOnce(refreshFail)
        )

        const onInvalidated = vi.fn()
        const unregister = registerSessionInvalidatedHandler(onInvalidated)
        try {
            await expect(
                apiFetch('/r', { token: 'stale' })
            ).rejects.toMatchObject({
                name: 'ApiError',
                status: 401,
            })
        } finally {
            unregister()
        }

        expect(onInvalidated).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledTimes(2)
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
