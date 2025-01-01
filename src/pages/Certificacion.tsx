import { CheckCircle2, Clock } from "lucide-react";

interface CertRow {
  item: string;
  unidad: string;
  totalPlan: number;
  certAcum: number;
  certPct: number;
}

const MOCK: CertRow[] = [
  { item: "Hormigón H21 — Losa N1", unidad: "m³", totalPlan: 120, certAcum: 84, certPct: 70 },
  { item: "Acero ADN 420", unidad: "kg", totalPlan: 8000, certAcum: 5600, certPct: 70 },
  { item: "Mampostería L.C.H.", unidad: "m²", totalPlan: 640, certAcum: 320, certPct: 50 },
  { item: "Encofrado metálico", unidad: "m²", totalPlan: 300, certAcum: 210, certPct: 70 },
];

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-positive transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-semibold w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function Certificacion() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Certificación</h1>
        <p className="text-sm text-muted-foreground">
          Avance global de obra — certificaciones acumuladas
        </p>
      </div>

      {/* Global progress */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle2 className="h-5 w-5 text-positive" />
          <p className="font-bold">Avance global: <span className="font-mono">65%</span></p>
        </div>
        <ProgressBar pct={65} />
        <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> Última certificación: 15 Mar 2024
        </p>
      </div>

      {/* Per-item table */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ítem</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Unidad</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Plan</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Cert. Acum.</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground w-48">Avance</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{row.item}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{row.unidad}</td>
                <td className="px-4 py-3 text-right font-mono">{row.totalPlan.toLocaleString("es-AR")}</td>
                <td className="px-4 py-3 text-right font-mono">{row.certAcum.toLocaleString("es-AR")}</td>
                <td className="px-4 py-3">
                  <ProgressBar pct={row.certPct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          <strong>Certificación detallada:</strong> ingreso de avances por periodo,
          aprobación por rubro, y back-calculation de consumos teóricos se expanden
          iterativamente.
        </p>
      </div>
    </div>
  );
}
