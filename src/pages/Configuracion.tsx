import { Settings, Globe, DollarSign } from "lucide-react";

export default function Configuracion() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes del proyecto y del estudio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Currency config */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-bold">Monedas</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span>ARS (Peso argentino)</span>
              <span className="font-mono text-muted-foreground">Principal</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span>USD Oficial</span>
              <span className="font-mono text-muted-foreground">TC: $870</span>
            </div>
            <div className="flex justify-between">
              <span>USD Blue</span>
              <span className="font-mono text-muted-foreground">TC: $1.180</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-moneda con tratamiento diferenciado de USD oficial/blue es un requerimiento del producto.
          </p>
        </div>

        {/* Tenancy */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-bold">Estudio / Tenancy</h2>
          </div>
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Subdominio:</span> <span className="font-mono">studio-demo.siteindex.com</span></p>
            <p><span className="text-muted-foreground">Plan:</span> <span className="font-mono">Phase 1 — Beta</span></p>
          </div>
        </div>

        {/* Roles stub */}
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-bold text-muted-foreground">Roles & permisos</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Roles específicos y permisos por proyecto — <em>TBD, se definirán durante implementación.</em>
          </p>
        </div>
      </div>
    </div>
  );
}
