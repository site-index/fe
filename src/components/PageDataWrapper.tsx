import type { ReactNode } from 'react'

import { getApiErrorMessage } from '@/lib/api'

interface PageDataWrapperProps {
    title: string
    projectsLoading: boolean
    emptyProject: boolean
    emptyMessage?: string
    isPending: boolean
    error: Error | null
    children: ReactNode
}

export default function PageDataWrapper({
    title,
    projectsLoading,
    emptyProject,
    emptyMessage = 'Elegí un proyecto para continuar.',
    isPending,
    error,
    children,
}: PageDataWrapperProps) {
    if (projectsLoading) {
        return (
            <div className="text-sm text-muted-foreground">
                Cargando proyectos…
            </div>
        )
    }

    if (emptyProject) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-black tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
        )
    }

    if (isPending) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-black tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">Cargando…</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-black tracking-tight">{title}</h1>
                <p className="text-sm text-destructive">
                    {getApiErrorMessage(error)}
                </p>
            </div>
        )
    }

    return <>{children}</>
}
