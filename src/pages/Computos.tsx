import { Link } from "react-router-dom";
import { Plus, ChevronRight, Package, Wrench, HardHat, FlaskConical } from "lucide-react";

interface ComputeItem {
  id: string;
  rubro: string;
  item: string;
  unidad: string;
  cantidad: number;
  precioUnit: number;
  total: number;
  flaky: boolean;
  pillars: { materiales: number; manoDeObra: number; equipo: number };
}

const MOCK_DATA: ComputeItem[] = [
  {
    id: "1",
    rubro: "Estructura",
    item: "Hormigón H21 — Losa Nivel 1",
    unidad: "m³",
    cantidad: 120,
    precioUnit: 40000,
    total: 4800000,
    flaky: false,
    pillars: { materiales: 65, manoDeObra: 25, equipo: 10 },
  },
  {
    id: "2",
    rubro: "Estructura",
    item: "Acero ADN 420 — Armadura general",
    unidad: "kg",
    cantidad: 8000,
    precioUnit: 400,
    total: 3200000,
    flaky: true,
    pillars: { materiales: 80, manoDeObra: 15, equipo: 5 },
  },
  {
    id: "3",
    rubro: "Mampostería",
    item: "Ladrillo cerámico hueco 18×18×33",
    unidad: "m²",
    cantidad: 640,
    precioUnit: 2500,
    total: 1600000,
    flaky: false,
    pillars: { materiales: 55, manoDeObra: 40, equipo: 5 },
  },
  {
    id: "4",
    rubro: "Estructura",
    item: "Encofrado metálico — Losas",
    unidad: "m²",
    cantidad: 300,
    precioUnit: 3000,
    total: 900000,
    flaky: true,
    pillars: { materiales: 20, manoDeObra: 30, equipo: 50 },
  },
];

function PillarBar({ materiales, manoDeObra, equipo }: { materiales: number; manoDeObra: number; equipo: number }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      <div className="bg-graphite" style={{ width: `${materiales}%` }} title={`Materiales ${materiales}%`} />
      <div className="bg-positive" style={{ width: `${manoDeObra}%` }} title={`M.O. ${manoDeObra}%`} />
      <div className="bg-muted-foreground/40" style={{ width: `${equipo}%` }} title={`Equipo ${equipo}%`} />
    </div>
  );
}

export default function Computos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Cómputos & APU</h1>
          <p className="text-sm text-muted-foreground">
            Análisis de precios unitarios — 3 pilares: Materiales · M.O. · Equipo
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Nuevo ítem
        </button>
      </div>

      {/* Pillar legend */}
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

      {/* Items table */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Rubro / Ítem</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Unidad</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Cantidad</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">P. Unitario</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground w-32">APU Split</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {MOCK_DATA.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">{item.rubro}</p>
                  <p className={`font-medium ${item.flaky ? "data-flaky" : ""}`}>{item.item}</p>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{item.unidad}</td>
                <td className="px-4 py-3 text-right font-mono">{item.cantidad.toLocaleString("es-AR")}</td>
                <td className="px-4 py-3 text-right font-mono">
                  ${item.precioUnit.toLocaleString("es-AR")}
                </td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${item.flaky ? "data-flaky" : ""}`}>
                  ${item.total.toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-3">
                  <PillarBar {...item.pillars} />
                </td>
                <td className="px-4 py-3">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dosificaciones link */}
      <Link
        to="/dosificaciones"
        className="flex items-center gap-3 rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
      >
        <FlaskConical className="h-6 w-6 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-bold">Dosificaciones</p>
          <p className="text-xs text-muted-foreground">
            Mezclas y conversiones paramétricas (m² → m³ → bolsas) — configurar por ítem
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </div>
  );
}
