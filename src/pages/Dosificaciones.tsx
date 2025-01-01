import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronRight, FlaskConical, ArrowLeft, Package, Trash2, ExternalLink } from "lucide-react";

// --- Types ---
interface DosificacionComponent {
  id: string;
  insumo: string;
  unidad: string;
  cantidadPorUnidad: number; // quantity per unit of output
  unidadCompra: string;      // purchasing unit
  rendimientoPorCompra: number; // how many output-units one purchase-unit covers
  desperdicioP: number;       // waste %
}

interface Dosificacion {
  id: string;
  nombre: string;
  descripcion: string;
  unidadSalida: string; // output unit (e.g. m³)
  componentes: DosificacionComponent[];
  linkedItems: string[];  // IDs of cómputo items using this dosificación
}

// --- Mock data ---
const INITIAL_DOSIFICACIONES: Dosificacion[] = [
  {
    id: "dos-1",
    nombre: "Hormigón H21",
    descripcion: "Mezcla estándar H21 para losas y vigas — dosificación manual",
    unidadSalida: "m³",
    linkedItems: ["1"],
    componentes: [
      { id: "c1", insumo: "Cemento Portland", unidad: "kg", cantidadPorUnidad: 350, unidadCompra: "bolsa 50kg", rendimientoPorCompra: 50, desperdicioP: 3 },
      { id: "c2", insumo: "Arena gruesa", unidad: "m³", cantidadPorUnidad: 0.65, unidadCompra: "m³", rendimientoPorCompra: 1, desperdicioP: 5 },
      { id: "c3", insumo: "Piedra partida 6-20", unidad: "m³", cantidadPorUnidad: 0.65, unidadCompra: "m³", rendimientoPorCompra: 1, desperdicioP: 5 },
      { id: "c4", insumo: "Agua", unidad: "litros", cantidadPorUnidad: 180, unidadCompra: "litros", rendimientoPorCompra: 1, desperdicioP: 0 },
    ],
  },
  {
    id: "dos-2",
    nombre: "Mortite de asiento 1:3",
    descripcion: "Mortero para mampostería — proporción 1:3 cemite:arena",
    unidadSalida: "m³",
    linkedItems: ["3"],
    componentes: [
      { id: "c5", insumo: "Cemento Portland", unidad: "kg", cantidadPorUnidad: 440, unidadCompra: "bolsa 50kg", rendimientoPorCompra: 50, desperdicioP: 3 },
      { id: "c6", insumo: "Arena fina", unidad: "m³", cantidadPorUnidad: 0.98, unidadCompra: "m³", rendimientoPorCompra: 1, desperdicioP: 5 },
      { id: "c7", insumo: "Agua", unidad: "litros", cantidadPorUnidad: 260, unidadCompra: "litros", rendimientoPorCompra: 1, desperdicioP: 0 },
    ],
  },
  {
    id: "dos-3",
    nombre: "Armadura tipo — Losa",
    descripcion: "Acero ADN 420 para losas — incluye alambre de atar",
    unidadSalida: "m²",
    linkedItems: ["2"],
    componentes: [
      { id: "c8", insumo: "Acero ADN 420 Ø10", unidad: "kg", cantidadPorUnidad: 8.5, unidadCompra: "barra 12m", rendimientoPorCompra: 7.4, desperdicioP: 8 },
      { id: "c9", insumo: "Acero ADN 420 Ø6", unidad: "kg", cantidadPorUnidad: 3.2, unidadCompra: "barra 12m", rendimientoPorCompra: 2.66, desperdicioP: 10 },
      { id: "c10", insumo: "Alambre negro Ø16", unidad: "kg", cantidadPorUnidad: 0.12, unidadCompra: "rollo 25kg", rendimientoPorCompra: 25, desperdicioP: 5 },
    ],
  },
];

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
      <p className="text-sm font-semibold">
        Conversor paramétrico
      </p>
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
        <span className="text-sm font-mono text-muted-foreground">{dosificacion.unidadSalida}</span>
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
            const { neto, conDesperdicio, unidadesCompra } = calcCompra(comp, cantidad);
            return (
              <tr key={comp.id} className="border-t border-border">
                <td className="py-1.5">{comp.insumo}</td>
                <td className="py-1.5 text-right font-mono">{neto.toFixed(1)} {comp.unidad}</td>
                <td className="py-1.5 text-right font-mono">{conDesperdicio.toFixed(1)} {comp.unidad}</td>
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

function DosificacionDetail({ d, onBack }: { d: Dosificacion; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Insumo</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Cant / {d.unidadSalida}</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Unidad</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Und. Compra</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Rend./Compra</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Desperdicio</th>
            </tr>
          </thead>
          <tbody>
            {d.componentes.map((comp) => (
              <tr key={comp.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{comp.insumo}</td>
                <td className="px-4 py-3 text-right font-mono">{comp.cantidadPorUnidad}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{comp.unidad}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{comp.unidadCompra}</td>
                <td className="px-4 py-3 text-right font-mono">{comp.rendimientoPorCompra}</td>
                <td className="px-4 py-3 text-right font-mono">{comp.desperdicioP}%</td>
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
  const dosificaciones = INITIAL_DOSIFICACIONES;

  const selected = dosificaciones.find((d) => d.id === selectedId);

  if (selected) {
    return <DosificacionDetail d={selected} onBack={() => setSelectedId(null)} />;
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
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Nueva dosificación
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dosificaciones.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedId(d.id)}
            className="rounded-lg border border-border bg-card p-5 shadow-sm text-left hover:shadow-md hover:border-primary/30 transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <FlaskConical className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{d.unidadSalida}</span>
            </div>
            <h3 className="font-bold mb-1">{d.nombre}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{d.descripcion}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{d.componentes.length} componentes</span>
              <span className="flex items-center gap-1">
                {d.linkedItems.length} ítems <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
