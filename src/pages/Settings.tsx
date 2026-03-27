import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DollarSign, Globe, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getHealthUrl } from "@/lib/api";

/** Settings / configuration page (UI copy in Spanish). */
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { accessToken, studioSlug, setStudioSlug, logout } = useAuth();

  const [slugDraft, setSlugDraft] = useState(studioSlug);
  useEffect(() => {
    setSlugDraft(studioSlug);
  }, [studioSlug]);

  const [healthReachable, setHealthReachable] = useState<boolean | null>(null);
  const [healthCheckPending, setHealthCheckPending] = useState(false);

  const runHealthCheck = useCallback(async () => {
    setHealthCheckPending(true);
    try {
      const response = await fetch(getHealthUrl());
      setHealthReachable(response.ok);
    } catch {
      setHealthReachable(false);
    } finally {
      setHealthCheckPending(false);
    }
  }, []);

  useEffect(() => {
    void runHealthCheck();
  }, [runHealthCheck]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes del proyecto y del estudio
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-sm">Conexión API</h2>
        <p className="text-xs text-muted-foreground">
          Con proxy de Vite, la base es <span className="font-mono">/api</span>{" "}
          (ver <span className="font-mono">vite.config.ts</span>). Podés fijar{" "}
          <span className="font-mono">VITE_API_URL</span> para apuntar al
          backend sin proxy.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void runHealthCheck()}
            disabled={healthCheckPending}
          >
            {healthCheckPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Probar GET /health"
            )}
          </Button>
          {healthReachable === true && (
            <span className="text-sm text-positive font-medium">
              Servidor disponible
            </span>
          )}
          {healthReachable === false && (
            <span className="text-sm text-destructive">
              Sin respuesta en {getHealthUrl()}
            </span>
          )}
        </div>

        <div className="space-y-2 max-w-md">
          <Label htmlFor="studio-slug">
            Slug del estudio (header X-Studio-Slug)
          </Label>
          <Input
            id="studio-slug"
            value={slugDraft}
            onChange={(e) => setSlugDraft(e.target.value)}
            onBlur={() => setStudioSlug(slugDraft.trim().toLowerCase())}
            placeholder="ej. acme"
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm">
            Sesión activa{" "}
            <span className="font-mono text-xs opacity-80">
              ({accessToken?.slice(0, 12)}…)
            </span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              logout();
              void queryClient.invalidateQueries({ queryKey: ["projects"] });
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
              <span className="font-mono text-muted-foreground">
                TC: $1.180
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-moneda con tratamiento diferenciado de USD oficial/blue es un
            requerimiento del producto.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-bold">Estudio / Tenancy</h2>
          </div>
          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Slug actual:</span>{" "}
              <span className="font-mono">{studioSlug || "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Plan:</span>{" "}
              <span className="font-mono">Phase 1 — Beta</span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-bold text-muted-foreground">
              Roles & permisos
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Roles específicos y permisos por proyecto —{" "}
            <em>TBD, se definirán durante implementación.</em>
          </p>
        </div>
      </div>
    </div>
  );
}
