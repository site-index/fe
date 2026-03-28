import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Plus,
  ChevronRight,
  Package,
  Wrench,
  HardHat,
  FlaskConical,
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, getApiErrorMessage } from "@/lib/api";

export type BoqItemRow = {
  id: string;
  rubro: string;
  item: string;
  unidad: string;
  cantidad: number;
  precioUnit: number;
  total: number;
  flaky: boolean;
  pillars: { materiales: number; manoDeObra: number; equipo: number };
};

function PillarBar({
  materiales,
  manoDeObra,
  equipo,
}: {
  materiales: number;
  manoDeObra: number;
  equipo: number;
}) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      <div
        className="bg-graphite"
        style={{ width: `${materiales}%` }}
        title={`Materiales ${materiales}%`}
      />
      <div
        className="bg-positive"
        style={{ width: `${manoDeObra}%` }}
        title={`M.O. ${manoDeObra}%`}
      />
      <div
        className="bg-muted-foreground/40"
        style={{ width: `${equipo}%` }}
        title={`Equipo ${equipo}%`}
      />
    </div>
  );
}

export default function BoqItems() {
  const { activeProject, projectsLoading } = useProject();
  const { accessToken, studioSlug } = useAuth();
  const empty = activeProject.id === "__empty__";

  const { data, isPending, error } = useQuery({
    queryKey: ["boq-items", activeProject.id, accessToken, studioSlug],
    queryFn: () =>
      apiFetch<BoqItemRow[]>(`/v1/projects/${activeProject.id}/boq-items`, {
        token: accessToken,
        studioSlug,
      }),
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
        <h1 className="text-2xl font-black tracking-tight">Cómputos & APU</h1>
        <p className="text-sm text-muted-foreground">
          Elegí o creá un proyecto para ver ítems de cómputo.
        </p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Cómputos & APU</h1>
        <p className="text-sm text-muted-foreground">Cargando ítems…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Cómputos & APU</h1>
        <p className="text-sm text-destructive">{getApiErrorMessage(error)}</p>
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Cómputos & APU</h1>
          <p className="text-sm text-muted-foreground">
            Análisis de precios unitarios — 3 pilares: Materiales · M.O. ·
            Equipo
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors opacity-60 cursor-not-allowed"
          disabled
          title="Creación por API próximamente"
        >
          <Plus className="h-4 w-4" />
          Nuevo ítem
        </button>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-graphite" /> Materiales
        </span>
        <span className="flex items-center gap-1.5">
          <HardHat className="h-3.5 w-3.5 text-positive" /> Mano de Obra
        </span>
        <span className="flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground/60" /> Equipo
        </span>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                Rubro / Ítem
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Unidad
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Cantidad
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                P. Unitario
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Total
              </th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground w-32">
                APU Split
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No hay ítems de cómputo. Creálos vía API o seed de desarrollo.
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      {item.rubro}
                    </p>
                    <p
                      className={`font-medium ${item.flaky ? "data-flaky" : ""}`}
                    >
                      {item.item}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {item.unidad}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {item.cantidad.toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${item.precioUnit.toLocaleString("es-AR")}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-semibold ${item.flaky ? "data-flaky" : ""}`}
                  >
                    ${item.total.toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3">
                    <PillarBar {...item.pillars} />
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Link
        to="/mix-designs"
        className="flex items-center gap-3 rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
      >
        <FlaskConical className="h-6 w-6 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-bold">Dosificaciones</p>
          <p className="text-xs text-muted-foreground">
            Mezclas y conversiones paramétricas
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </div>
  );
}
