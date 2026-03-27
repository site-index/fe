import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, getApiErrorMessage } from "@/lib/api";

type CertRow = {
  item: string;
  unidad: string;
  totalPlan: number;
  certAcum: number;
  certPct: number;
};

type CertSummary = {
  pct: number;
  lastCertLabel: string | null;
};

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-positive transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-semibold w-10 text-right">
        {pct}%
      </span>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function Certificacion() {
  const { activeProject, projectsLoading } = useProject();
  const { accessToken, studioSlug } = useAuth();
  const empty = activeProject.id === "__empty__";

  const qRows = useQuery({
    queryKey: ["certifications", activeProject.id, accessToken, studioSlug],
    queryFn: () =>
      apiFetch<CertRow[]>(`/v1/projects/${activeProject.id}/certifications`, {
        token: accessToken,
        studioSlug,
      }),
    enabled:
      Boolean(accessToken && studioSlug.trim()) && !empty && !projectsLoading,
  });

  const qSummary = useQuery({
    queryKey: [
      "certifications-summary",
      activeProject.id,
      accessToken,
      studioSlug,
    ],
    queryFn: () =>
      apiFetch<CertSummary>(
        `/v1/projects/${activeProject.id}/certifications/summary`,
        { token: accessToken, studioSlug },
      ),
    enabled:
      Boolean(accessToken && studioSlug.trim()) && !empty && !projectsLoading,
  });

  if (projectsLoading) {
    return (
      <div className="text-sm text-muted-foreground">Cargando proyectos…</div>
    );
  }

  if (empty) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Certificación</h1>
        <p className="text-sm text-muted-foreground">
          Elegí un proyecto para ver certificaciones.
        </p>
      </div>
    );
  }

  if (qRows.isPending || qSummary.isPending) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Certificación</h1>
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  const err = qRows.error ?? qSummary.error;
  if (err) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Certificación</h1>
        <p className="text-sm text-destructive">{getApiErrorMessage(err)}</p>
      </div>
    );
  }

  const rows = qRows.data ?? [];
  const summary = qSummary.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Certificación</h1>
        <p className="text-sm text-muted-foreground">
          Avance global de obra — certificaciones acumuladas
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle2 className="h-5 w-5 text-positive" />
          <p className="font-bold">
            Avance global:{" "}
            <span className="font-mono">{summary?.pct ?? 0}%</span>
          </p>
        </div>
        <ProgressBar pct={summary?.pct ?? 0} />
        <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> Última certificación:{" "}
          {formatDate(summary?.lastCertLabel ?? null)}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                Ítem
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Unidad
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Plan
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Cert. Acum.
              </th>
              <th className="px-4 py-3 font-semibold text-muted-foreground w-48">
                Avance
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No hay ítems de cómputo con cantidad planificada.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={`${row.item}-${i}`}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{row.item}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {row.unidad}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {row.totalPlan.toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {row.certAcum.toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar pct={row.certPct} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          <strong>Certificación detallada:</strong> ingreso de avances por
          periodo, aprobación por rubro, y back-calculation de consumos teóricos
          se expanden iterativamente.
        </p>
      </div>
    </div>
  );
}
