import { LayoutDashboard, Calculator, ClipboardCheck, AlertTriangle, Settings, Building2, FlaskConical, ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useProject, PROJECTS } from "@/contexts/ProjectContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/computos", label: "Cómputos / APU", icon: Calculator },
  { to: "/dosificaciones", label: "Dosificaciones", icon: FlaskConical },
  { to: "/certificacion", label: "Certificación", icon: ClipboardCheck },
  { to: "/supuestos", label: "Supuestos", icon: AlertTriangle },
];

export default function AppSidebar() {
  const location = useLocation();
  const { activeProject, setActiveProject } = useProject();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Building2 className="h-7 w-7 text-sidebar-primary" />
        <span className="text-lg font-black tracking-tight text-sidebar-foreground">
          SITE INDEX
        </span>
      </div>

      {/* Project selector */}
      <div className="mx-3 mb-4 relative">
        <button
          onClick={() => setProjectMenuOpen(!projectMenuOpen)}
          className="w-full rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-2 text-left hover:border-sidebar-primary/40 transition-colors"
        >
          <p className="text-xs text-sidebar-muted">Proyecto activo</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              {activeProject.name}
            </p>
            <ChevronDown className={cn("h-3.5 w-3.5 text-sidebar-muted shrink-0 transition-transform", projectMenuOpen && "rotate-180")} />
          </div>
        </button>
        {projectMenuOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 rounded-md border border-sidebar-border bg-sidebar shadow-lg z-10">
            {PROJECTS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActiveProject(p); setProjectMenuOpen(false); }}
                className={cn(
                  "w-full px-3 py-2.5 text-left text-sm transition-colors",
                  p.id === activeProject.id
                    ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <NavLink
          to="/configuracion"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-muted hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Configuración
        </NavLink>
      </div>
    </aside>
  );
}
