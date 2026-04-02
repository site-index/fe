import {
    AlertTriangle,
    Calculator,
    ChevronDown,
    ClipboardCheck,
    FlaskConical,
    LayoutDashboard,
    Library,
    LogOut,
    Settings,
    User,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { cn } from '@/lib/utils'

import CreateProjectDialog from './CreateProjectDialog'
import SiteLogo from './SiteLogo'
import ThemeToggle from './ThemeToggle'

const navItems = [
    { to: '/', label: 'Tablero', icon: LayoutDashboard },
    { to: '/budget-lines', label: 'Cómputo & Presupuesto', icon: Calculator },
    { to: '/item-yields', label: 'Rendimientos', icon: FlaskConical },
    {
        to: '/studio-catalog-items',
        label: 'Biblioteca del estudio',
        icon: Library,
    },
    { to: '/certifications', label: 'Certificación', icon: ClipboardCheck },
    { to: '/assumptions', label: 'Supuestos', icon: AlertTriangle },
]

interface SidebarContentProps {
    onNavigate?: () => void
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
    const [projectMenuOpen, setProjectMenuOpen] = useState(false)

    return (
        <div className="flex h-full flex-col">
            {/* Brand */}
            <div className="flex items-center px-5 py-5">
                <SiteLogo invertOnDark className="h-24 sm:h-40 w-auto" />
            </div>

            {/* Project selector */}
            <div className="mx-3 mb-4 relative">
                <button
                    onClick={() =>
                        projects.length > 1 &&
                        setProjectMenuOpen(!projectMenuOpen)
                    }
                    className={cn(
                        'w-full rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-2 text-left transition-colors',
                        projects.length > 1 &&
                            'hover:border-sidebar-primary/40 cursor-pointer',
                        projects.length <= 1 && 'cursor-default'
                    )}
                >
                    <p className="text-xs text-sidebar-muted">
                        Proyecto activo
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-sidebar-foreground truncate">
                            {activeProject.name}
                        </p>
                        {projects.length > 1 && (
                            <ChevronDown
                                className={cn(
                                    'h-3.5 w-3.5 text-sidebar-muted shrink-0 transition-transform',
                                    projectMenuOpen && 'rotate-180'
                                )}
                            />
                        )}
                    </div>
                </button>
                {projectMenuOpen && projects.length > 1 && (
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
