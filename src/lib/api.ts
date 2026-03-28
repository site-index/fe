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
    /** Sent as X-Studio-Slug; required for tenant routes (see BE tenant middleware). */
    studioSlug?: string | null
}

type ApiFetchInternalOptions = ApiFetchOptions & { _retry?: boolean }

/** In-memory access token fallback when callers omit `token` (synced from AuthContext). */
let apiAccessTokenRef: string | null = null

let persistAccessTokenHandler: ((token: string) => void) | null = null

/** Called from AuthContext when the stored access token changes. */
export function syncApiAccessToken(token: string | null): void {
    apiAccessTokenRef = token
}

/** Refresh flow persists the new access token via this handler (e.g. React state + localStorage). */
export function registerAccessTokenPersistence(
    onPersist: (token: string) => void
): () => void {
    persistAccessTokenHandler = onPersist
    return () => {
        persistAccessTokenHandler = null
    }
}

async function tryRefreshAccessToken(): Promise<string | null> {
    const base = getApiBase()
    const res = await fetch(`${base}/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
        return null
    }
    const data = (await res.json()) as { accessToken: string }
    persistAccessTokenHandler?.(data.accessToken)
    apiAccessTokenRef = data.accessToken
    return data.accessToken
}

function buildRequestHeaders(
    options: ApiFetchOptions,
    token: string | null | undefined
): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`
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

function buildUrl(path: string): string {
    const base = getApiBase()
    return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

async function apiFetchOnce(
    url: string,
    rest: ApiFetchOptions,
    token: string | null | undefined
): Promise<Response> {
    return fetch(url, {
        method: rest.method ?? 'GET',
        credentials: 'include',
        headers: buildRequestHeaders(rest, token ?? undefined),
        body: rest.body !== undefined ? JSON.stringify(rest.body) : undefined,
    })
}

export async function apiFetch<T>(
    path: string,
    options: ApiFetchInternalOptions = {}
): Promise<T> {
    const { _retry, ...rest } = options
    const url = buildUrl(path)
    const token = rest.token ?? apiAccessTokenRef
    const res = await apiFetchOnce(url, rest, token)

    if (res.status === 401 && !_retry) {
        const newToken = await tryRefreshAccessToken()
        if (newToken) {
            return apiFetch<T>(path, {
                ...rest,
                _retry: true,
                token: newToken,
            })
        }
    }

    if (!res.ok) {
        throw new ApiError(res.status, await readErrorBody(res))
    }

    return readSuccessBody<T>(res)
}

/** Clears the httpOnly refresh session (best-effort). */
export async function apiLogout(): Promise<void> {
    const base = getApiBase()
    await fetch(`${base}/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    })
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
    return 'Unknown error'
}
