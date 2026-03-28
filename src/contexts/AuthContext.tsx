import { useQueryClient } from '@tanstack/react-query'
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    apiFetch,
    apiLogout,
    refreshAccessToken,
    registerAccessTokenPersistence,
    registerSessionInvalidatedHandler,
    syncApiAccessToken,
} from '@/lib/api'
import { isAccessTokenExpired, parseAccessTokenEmail } from '@/lib/jwt-display'

const LS_TOKEN = 'siteindex_access_token'
const LS_SLUG = 'siteindex_studio_slug'

type AuthContextValue = {
    accessToken: string | null
    sessionEmail: string | null
    studioSlug: string
    setStudioSlug: (slug: string) => void
    isAuthenticated: boolean
    login: (email: string, password: string) => Promise<void>
    register: (payload: {
        email: string
        password: string
        studioSlug: string
        studioName: string
    }) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient()
    const [accessToken, setAccessToken] = useState<string | null>(() =>
        localStorage.getItem(LS_TOKEN)
    )
    const [studioSlug, setStudioSlugState] = useState(() => {
        const fromLs = localStorage.getItem(LS_SLUG)
        if (fromLs) return fromLs
        return import.meta.env.VITE_STUDIO_SLUG?.trim() ?? ''
    })

    useEffect(() => {
        syncApiAccessToken(accessToken)
    }, [accessToken])

    useEffect(() => {
        return registerAccessTokenPersistence((token) => {
            setAccessToken(token)
            localStorage.setItem(LS_TOKEN, token)
        })
    }, [])

    useEffect(() => {
        const s = studioSlug.trim().toLowerCase()
        if (s) localStorage.setItem(LS_SLUG, s)
        else localStorage.removeItem(LS_SLUG)
    }, [studioSlug])

    const setStudioSlug = useCallback((slug: string) => {
        setStudioSlugState(slug.trim().toLowerCase())
    }, [])

    const clearClientAuth = useCallback(() => {
        setAccessToken(null)
        localStorage.removeItem(LS_TOKEN)
        localStorage.removeItem(LS_SLUG)
        setStudioSlugState('')
        syncApiAccessToken(null)
        queryClient.clear()
    }, [queryClient])

    useEffect(() => {
        return registerSessionInvalidatedHandler(() => {
            clearClientAuth()
        })
    }, [clearClientAuth])

    useEffect(() => {
        const t = localStorage.getItem(LS_TOKEN)
        if (!t || !isAccessTokenExpired(t)) return
        void (async () => {
            const next = await refreshAccessToken()
            if (!next) clearClientAuth()
        })()
    }, [clearClientAuth])

    const login = useCallback(async (email: string, password: string) => {
        const res = await apiFetch<{
            accessToken: string
            studio: { slug: string }
        }>('/v1/auth/login', {
            method: 'POST',
            body: { email, password },
        })
        const slug = res.studio.slug.trim().toLowerCase()
        setStudioSlugState(slug)
        localStorage.setItem(LS_SLUG, slug)
        setAccessToken(res.accessToken)
        localStorage.setItem(LS_TOKEN, res.accessToken)
    }, [])

    const register = useCallback(
        async (payload: {
            email: string
            password: string
            studioSlug: string
            studioName: string
        }) => {
            const res = await apiFetch<{
                accessToken: string
                studio: { slug: string }
            }>('/v1/auth/register', {
                method: 'POST',
                body: payload,
            })
            const slug = res.studio.slug
            setStudioSlugState(slug)
            localStorage.setItem(LS_SLUG, slug)
            setAccessToken(res.accessToken)
            localStorage.setItem(LS_TOKEN, res.accessToken)
        },
        []
    )

    const logout = useCallback(async () => {
        clearClientAuth()
        void apiLogout()
    }, [clearClientAuth])

    const sessionEmail = useMemo(
        () => parseAccessTokenEmail(accessToken),
        [accessToken]
    )

    const value = useMemo<AuthContextValue>(
        () => ({
            accessToken,
            sessionEmail,
            studioSlug,
            setStudioSlug,
            isAuthenticated: Boolean(accessToken),
            login,
            register,
            logout,
        }),
        [
            accessToken,
            sessionEmail,
            studioSlug,
            setStudioSlug,
            login,
            register,
            logout,
        ]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
