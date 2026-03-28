/** API origin: full URL (e.g. http://localhost:3000) or empty to use Vite proxy `/api`. */
function getApiBase(): string {
    const v = import.meta.env.VITE_API_URL?.trim()
    if (v) return v.replace(/\/$/, '')
    return '/api'
}

export class ApiError extends Error {
    constructor(
        public status: number,
        public body: unknown
    ) {
        super(`HTTP ${status}`)
        this.name = 'ApiError'
    }
}

export type ApiFetchOptions = {
    method?: string
    body?: unknown
    token?: string | null
    /** Required for tenant routes when using plain localhost (see BE tenant middleware). */
    studioSlug?: string | null
}

function buildRequestHeaders(options: ApiFetchOptions): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`
    }
    const slug = options.studioSlug?.trim()
    if (slug) {
        headers['X-Studio-Slug'] = slug
    }
    return headers
}

async function readErrorBody(res: Response): Promise<unknown> {
    try {
        return await res.json()
    } catch {
        return await res.text()
    }
}

async function readSuccessBody<T>(res: Response): Promise<T> {
    if (res.status === 204) {
        return undefined as T
    }
    const text = await res.text()
    if (!text) {
        return undefined as T
    }
    return JSON.parse(text) as T
}

export async function apiFetch<T>(
    path: string,
    options: ApiFetchOptions = {}
): Promise<T> {
    const base = getApiBase()
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
    const res = await fetch(url, {
        method: options.method ?? 'GET',
        headers: buildRequestHeaders(options),
        body:
            options.body !== undefined
                ? JSON.stringify(options.body)
                : undefined,
    })

    if (!res.ok) {
        throw new ApiError(res.status, await readErrorBody(res))
    }

    return readSuccessBody<T>(res)
}

export function getHealthUrl(): string {
    return `${getApiBase()}/health`
}

export function getApiErrorMessage(err: unknown): string {
    if (err instanceof ApiError) {
        const b = err.body as { message?: string | string[] }
        if (Array.isArray(b?.message)) return b.message.join(', ')
        if (typeof b?.message === 'string') return b.message
    }
    if (err instanceof Error) return err.message
    return 'Error desconocido'
}
