import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Plus,
  ChevronRight,
  FlaskConical,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, getApiErrorMessage } from "@/lib/api";

// --- Types ---
interface DosificacionComponent {
  id: string;
  insumo: string;
  unidad: string;
  cantidadPorUnidad: number; // quantity per unit of output
  unidadCompra: string; // purchasing unit
  rendimientoPorCompra: number; // how many output-units one purchase-unit covers
  desperdicioP: number; // waste %
}

interface Dosificacion {
  id: string;
  nombre: string;
  descripcion: string;
  unidadSalida: string; // output unit (e.g. m³)
  componentes: DosificacionComponent[];
  linkedItems: string[]; // IDs of cómputo items using this dosificación
}

// --- Converter helper ---
function calcCompra(comp: DosificacionComponent, cantidadSalida: number) {
  const neto = comp.cantidadPorUnidad * cantidadSalida;
  const conDesperdicio = neto * (1 + comp.desperdicioP / 100);
  const unidadesCompra = Math.ceil(conDesperdicio / comp.rendimientoPorCompra);
  return { neto, conDesperdicio, unidadesCompra };
}

// --- Sub-components ---
function ConverterWidget({ dosificacion }: { dosificacion: Dosificacion }) {
  const [cantidad, setCantidad] = useState(10);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <p className="text-sm font-semibold">Conversor paramétrico</p>
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Cantidad:</label>
        <input
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          className="w-24 rounded-md border border-input bg-card px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          min={0}
          step={1}
        />
        <span className="text-sm font-mono text-muted-foreground">
          {dosificacion.unidadSalida}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="text-left py-1">Insumo</th>
            <th className="text-right py-1">Neto</th>
            <th className="text-right py-1">+Desperdicio</th>
            <th className="text-right py-1">Compra</th>
          </tr>
        </thead>
        <tbody>
          {dosificacion.componentes.map((comp) => {
            const { neto, conDesperdicio, unidadesCompra } = calcCompra(
              comp,
              cantidad,
            );
            return (
              <tr key={comp.id} className="border-t border-border">
                <td className="py-1.5">{comp.insumo}</td>
                <td className="py-1.5 text-right font-mono">
                  {neto.toFixed(1)} {comp.unidad}
                </td>
                <td className="py-1.5 text-right font-mono">
                  {conDesperdicio.toFixed(1)} {comp.unidad}
                </td>
                <td className="py-1.5 text-right font-mono font-semibold">
                  {unidadesCompra} {comp.unidadCompra}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DosificacionDetail({
  d,
  onBack,
}: {
  d: Dosificacion;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a dosificaciones
      </button>

      <div>
        <h1 className="text-2xl font-black tracking-tight">{d.nombre}</h1>
        <p className="text-sm text-muted-foreground">{d.descripcion}</p>
        <span className="inline-block mt-1 rounded bg-muted px-2 py-0.5 text-xs font-mono">
          Unidad de salida: {d.unidadSalida}
        </span>
      </div>

      {/* Components table */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                Insumo
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Cant / {d.unidadSalida}
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Unidad
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Und. Compra
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Rend./Compra
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Desperdicio
              </th>
            </tr>
          </thead>
          <tbody>
            {d.componentes.map((comp) => (
              <tr
                key={comp.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium">{comp.insumo}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {comp.cantidadPorUnidad}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {comp.unidad}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {comp.unidadCompra}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {comp.rendimientoPorCompra}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {comp.desperdicioP}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Parametric converter */}
      <ConverterWidget dosificacion={d} />

      {/* Linked items */}
      {d.linkedItems.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            Ítems vinculados en Cómputos
          </p>
          <div className="space-y-1">
            {d.linkedItems.map((id) => (
              <Link
                key={id}
                to="/computos"
                className="block text-sm text-primary hover:underline"
              >
                Ítem #{id} → Ver en Cómputos
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main page ---
export default function Dosificaciones() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { activeProject, projectsLoading } = useProject();
  const { accessToken, studioSlug } = useAuth();
  const empty = activeProject.id === "__empty__";

  const {
    data: dosificaciones = [],
    isPending,
    error,
  } = useQuery({
    queryKey: ["dosificaciones", activeProject.id, accessToken, studioSlug],
    queryFn: () =>
      apiFetch<Dosificacion[]>(
        `/v1/projects/${activeProject.id}/dosificaciones`,
        { token: accessToken, studioSlug },
      ),
    enabled:
      Boolean(accessToken && studioSlug.trim()) && !empty && !projectsLoading,
  });

  const selected = dosificaciones.find((d) => d.id === selectedId);

  if (projectsLoading) {
    return (
      <div className="text-sm text-muted-foreground">Cargando proyectos…</div>
    );
  }

  if (empty) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Dosificaciones</h1>
        <p className="text-sm text-muted-foreground">
          Elegí un proyecto para ver dosificaciones.
        </p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Dosificaciones</h1>
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight">Dosificaciones</h1>
        <p className="text-sm text-destructive">{getApiErrorMessage(error)}</p>
      </div>
    );
  }

  if (selected) {
    return (
      <DosificacionDetail d={selected} onBack={() => setSelectedId(null)} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dosificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Mezclas y conversiones paramétricas — ingreso manual (Phase 1)
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground opacity-60 cursor-not-allowed"
          disabled
          title="Alta vía API próximamente"
        >
          <Plus className="h-4 w-4" />
          Nueva dosificación
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dosificaciones.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full">
            No hay dosificaciones. Creá una vía API o seed.
          </p>
        ) : (
          dosificaciones.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedId(d.id)}
              className="rounded-lg border border-border bg-card p-5 shadow-sm text-left hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <FlaskConical className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                  {d.unidadSalida}
                </span>
              </div>
              <h3 className="font-bold mb-1">{d.nombre}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {d.descripcion}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{d.componentes.length} componentes</span>
                <span className="flex items-center gap-1">
                  {d.linkedItems.length} ítems{" "}
                  <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
