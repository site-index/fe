import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

export type ScopeMode = 'studio' | 'project'

type ScopeContextValue = {
    mode: ScopeMode
    setMode: (next: ScopeMode) => void
    isStudioScope: boolean
    isProjectScope: boolean
}

const LS_SCOPE_MODE = 'siteindex_scope_mode'
const DEFAULT_SCOPE_MODE: ScopeMode = 'project'

const ScopeContext = createContext<ScopeContextValue | null>(null)

function parseStoredScopeMode(raw: string | null): ScopeMode {
    if (raw === 'studio' || raw === 'project') return raw
    return DEFAULT_SCOPE_MODE
}

export function ScopeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ScopeMode>(() =>
        parseStoredScopeMode(localStorage.getItem(LS_SCOPE_MODE))
    )

    useEffect(() => {
        localStorage.setItem(LS_SCOPE_MODE, mode)
    }, [mode])

    const value = useMemo<ScopeContextValue>(
        () => ({
            mode,
            setMode,
            isStudioScope: mode === 'studio',
            isProjectScope: mode === 'project',
        }),
        [mode]
    )

    return (
        <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
    )
}

export function useScope() {
    const ctx = useContext(ScopeContext)
    if (!ctx) throw new Error('useScope must be used within ScopeProvider')
    return ctx
}
