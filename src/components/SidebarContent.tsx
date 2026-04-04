import {
    Calculator,
    ChevronDown,
    FlaskConical,
    // LayoutDashboard,
    LogOut,
    Settings,
    User,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useScope } from '@/contexts/ScopeContext'
import { cn } from '@/lib/utils'

import CreateProjectDialog from './CreateProjectDialog'
import SiteLogo from './SiteLogo'
import ThemeToggle from './ThemeToggle'

const navItems = [
    // { to: '/', label: 'Tablero', icon: LayoutDashboard },
    { to: '/budget-lines', label: 'Cómputo & Presupuesto', icon: Calculator },
    // {
    //     to: '/resource-demand',
    //     label: 'Demanda de recursos',
    //     icon: PackageSearch,
    // },
    { to: '/item-yields', label: 'Rendimientos', icon: FlaskConical },
    // {
    //     to: '/studio-catalog-items',
    //     label: 'Biblioteca del estudio',
    //     icon: Library,
    // },
    // { to: '/certifications', label: 'Certificación', icon: ClipboardCheck },
    // { to: '/assumptions', label: 'Supuestos', icon: AlertTriangle },
]

interface SidebarContentProps {
    onNavigate?: () => void
}

function ScopeModeSelector({
    mode,
    onSelectProject,
    onSelectStudio,
}: {
    mode: 'project' | 'studio'
    onSelectProject: () => void
    onSelectStudio: () => void
}) {
    return (
        <div className="mx-3 mb-3 space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-muted">
                Contexto
            </p>
            <div className="grid grid-cols-2 rounded-md border border-sidebar-border bg-sidebar-accent p-1">
                <button
                    type="button"
                    onClick={onSelectProject}
                    className={cn(
                        'rounded px-2 py-1.5 text-xs font-semibold transition-colors',
                        mode === 'project'
                            ? 'bg-sidebar text-sidebar-foreground'
                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                    )}
                >
                    Proyecto
                </button>
                <button
                    type="button"
                    onClick={onSelectStudio}
                    className={cn(
                        'rounded px-2 py-1.5 text-xs font-semibold transition-colors',
                        mode === 'studio'
                            ? 'bg-sidebar text-sidebar-foreground'
                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                    )}
                >
                    Estudio
                </button>
            </div>
        </div>
    )
}

function ProjectSelector({
    activeProject,
    projects,
    projectMenuOpen,
    setProjectMenuOpen,
    setActiveProject,
    isProjectScope,
}: {
    activeProject: { id: string; name: string }
    projects: Array<{ id: string; name: string }>
    projectMenuOpen: boolean
    setProjectMenuOpen: (open: boolean) => void
    setActiveProject: (project: { id: string; name: string }) => void
    isProjectScope: boolean
}) {
    const isSingleProject = projects.length <= 1

    if (!isProjectScope) {
        return (
            <div className="mx-3 mb-4 relative">
                <button
                    className="w-full cursor-default rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-2 text-left transition-colors"
                    type="button"
                >
                    <p className="text-xs text-sidebar-muted">
                        Proyecto (modo estudio)
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-semibold text-sidebar-foreground/60">
                            {activeProject.name}
                        </p>
                    </div>
                </button>
            </div>
        )
    }

    if (isSingleProject) {
        return (
            <div className="mx-3 mb-4 relative">
                <button
                    className="w-full cursor-default rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-2 text-left transition-colors"
                    type="button"
                >
                    <p className="text-xs text-sidebar-muted">
                        Proyecto activo
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-semibold text-sidebar-foreground">
                            {activeProject.name}
                        </p>
                    </div>
                </button>
            </div>
        )
    }

    return (
        <div className="mx-3 mb-4 relative">
            <button
                onClick={() => setProjectMenuOpen(!projectMenuOpen)}
                className="w-full rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-2 text-left transition-colors hover:border-sidebar-primary/40 cursor-pointer"
            >
                <p className="text-xs text-sidebar-muted">Proyecto activo</p>
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate text-sidebar-foreground">
                        {activeProject.name}
                    </p>
                    <ChevronDown
                        className={cn(
                            'h-3.5 w-3.5 text-sidebar-muted shrink-0 transition-transform',
                            projectMenuOpen && 'rotate-180'
                        )}
                    />
                </div>
            </button>
            {projectMenuOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded-md border border-sidebar-border bg-sidebar shadow-lg z-10">
                    {projects.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => {
                                setActiveProject(p)
                                setProjectMenuOpen(false)
                            }}
                            className={cn(
                                'w-full px-3 py-2.5 text-left text-sm transition-colors',
                                p.id === activeProject.id
                                    ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function SidebarUserAvatar({ sessionEmail }: { sessionEmail: string | null }) {
    const initial = sessionEmail?.trim().charAt(0).toUpperCase() ?? ''
    return (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
            {initial ? (
                initial
            ) : (
                <User className="h-3.5 w-3.5 text-sidebar-muted" aria-hidden />
            )}
        </div>
    )
}

export default function SidebarContent({ onNavigate }: SidebarContentProps) {
    const location = useLocation()
    const { logout, sessionEmail } = useAuth()
    const { activeProject, setActiveProject, projects } = useProject()
    const { mode, setMode, isProjectScope } = useScope()
    const [projectMenuOpen, setProjectMenuOpen] = useState(false)

    return (
        <div className="flex h-full flex-col">
            {/* Brand */}
            <div className="flex items-center px-5 py-5">
                <SiteLogo invertOnDark className="h-24 sm:h-40 w-auto" />
            </div>

            <ScopeModeSelector
                mode={mode}
                onSelectProject={() => {
                    setMode('project')
                    setProjectMenuOpen(false)
                }}
                onSelectStudio={() => {
                    setMode('studio')
                    setProjectMenuOpen(false)
                }}
            />

            <ProjectSelector
                activeProject={activeProject}
                projects={projects}
                projectMenuOpen={projectMenuOpen}
                setProjectMenuOpen={setProjectMenuOpen}
                setActiveProject={setActiveProject}
                isProjectScope={isProjectScope}
            />

            <div className="mx-3 mb-2">
                <CreateProjectDialog />
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 px-3">
                {navItems.map((item) => {
                    const active =
                        item.to === '/'
                            ? location.pathname === '/'
                            : location.pathname === item.to ||
                              location.pathname.startsWith(`${item.to}/`)
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onNavigate}
                            className={cn(
                                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                                active
                                    ? 'bg-sidebar-accent text-sidebar-primary'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                        >
                            <item.icon className="h-4.5 w-4.5 shrink-0" />
                            {item.label}
                        </NavLink>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-sidebar-border p-3 space-y-2">
                {/* Settings row */}
                <NavLink
                    to="/settings"
                    onClick={onNavigate}
                    className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                        location.pathname === '/settings'
                            ? 'bg-sidebar-accent text-sidebar-primary'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                >
                    <Settings className="h-4.5 w-4.5 shrink-0" />
                    Configuración
                    <span className="ml-auto">
                        <ThemeToggle />
                    </span>
                </NavLink>

                {/* User row */}
                <div className="flex items-center gap-3 rounded-md px-3 py-2">
                    <SidebarUserAvatar sessionEmail={sessionEmail} />
                    <span className="flex-1 truncate text-sm text-sidebar-foreground/70">
                        {sessionEmail ?? '—'}
                    </span>
                    <button
                        onClick={() => {
                            logout()
                            onNavigate?.()
                        }}
                        className="rounded-md p-1.5 text-sidebar-muted hover:text-destructive transition-colors"
                        title="Cerrar sesión"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
