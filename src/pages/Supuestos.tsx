import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, getApiErrorMessage } from "@/lib/api";

type AssumptionRow = {
  id: string;
  text: string;
  type: "imputation" | "deviation" | "price_alert";
  montoARS: number;
  impacto: "alto" | "medio" | "bajo";
  fecha: string;
};

const typeLabels = {
  imputation: "Imputación",
  deviation: "Desvío",
  price_alert: "Precio",
};

const impactoColors = {
  alto: "text-negative font-semibold",
  medio: "text-yellow-600 font-medium",
  bajo: "text-muted-foreground",
};

export default function Supuestos() {
  const queryClient = useQueryClient();
  const { activeProject, projectsLoading } = useProject();
  const { accessToken, studioSlug } = useAuth();
  const empty = activeProject.id === "__empty__";

  const { data, isPending, error } = useQuery({
    queryKey: ["assumptions", activeProject.id, accessToken, studioSlug],
    queryFn: () =>
      apiFetch<AssumptionRow[]>(
        `/v1/projects/${activeProject.id}/assumptions`,
        { token: accessToken, studioSlug },
      ),
    enabled:
      Boolean(accessToken && studioSlug.trim()) && !empty && !projectsLoading,
  });

  const resolveMutation = useMutation({
    mutationFn: (assumptionId: string) =>
      apiFetch(`/v1/projects/${activeProject.id}/assumptions/${assumptionId}`, {
        method: "PATCH",
        token: accessToken,
        studioSlug,
        body: { status: "RESOLVED" },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["assumptions", activeProject.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["dashboard", activeProject.id],
      });
    },
  });

  if (projectsLoading) {
    return (
      <div className="text-sm text-muted-foreground">Cargando proyectos…</div>
    );
  }

  if (empty) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Supuestos</h1>
        <p className="text-sm text-muted-foreground">
          Elegí un proyecto para ver supuestos abiertos.
        </p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Supuestos</h1>
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Supuestos</h1>
        <p className="text-sm text-destructive">{getApiErrorMessage(error)}</p>
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Supuestos</h1>
          <p className="text-sm text-muted-foreground">
            Cola de decisiones del sistema — revisión asincrónica
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Ordenado por:{" "}
          <span className="font-semibold text-foreground">
            Dinero · Tiempo · Impacto
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        <strong>Mix de ordenamiento personalizable:</strong> sliders de Dinero /
        Tiempo / Impacto para rebalancear la prioridad de la cola.{" "}
        <em>(Phase 2)</em>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay supuestos abiertos.
          </p>
        ) : (
          rows.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-negative/70" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">
                    {typeLabels[a.type]}
                  </span>
                  <span className={`text-xs ${impactoColors[a.impacto]}`}>
                    {a.impacto.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {a.fecha}
                  </span>
                </div>
                <p className="text-sm">{a.text}</p>
                <p className="mt-1 text-xs font-mono text-muted-foreground">
                  Monto involucrado: ${a.montoARS.toLocaleString("es-AR")}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate(a.id)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-positive/15 px-3 py-1.5 text-xs font-semibold text-positive hover:bg-positive/25 transition-colors disabled:opacity-50"
                >
                  {resolveMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Confirmar
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/80 transition-colors opacity-60 cursor-not-allowed"
                  disabled
                  title="Edición próximamente"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold text-muted-foreground opacity-60 cursor-not-allowed"
          disabled
        >
          Confirmar todos los de bajo impacto (Pareto 90%)
        </button>
      </div>
    </div>
  );
}
