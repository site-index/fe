import { AlertTriangle, CheckCircle2, Edit3, ArrowUpDown } from "lucide-react";

interface Assumption {
  id: string;
  text: string;
  type: "imputation" | "deviation" | "price_alert";
  montoARS: number;
  impacto: "alto" | "medio" | "bajo";
  fecha: string;
}

const MOCK: Assumption[] = [
  { id: "1", text: "Imputé $340.000 de acero a Losa Nivel 3 basado en cronograma.", type: "imputation", montoARS: 340000, impacto: "alto", fecha: "2024-03-20" },
  { id: "2", text: "Precio de cemento Portland tiene 6 meses — usar promedio de mercado?", type: "price_alert", montoARS: 120000, impacto: "alto", fecha: "2024-03-19" },
  { id: "3", text: "Consumo de ladrillos excede dosificación en 8%. Actualizar margen de desperdicio?", type: "deviation", montoARS: 85000, impacto: "medio", fecha: "2024-03-18" },
  { id: "4", text: "Factura #1847 de ferretería sin rubro asignado — imputé a 'Extras / Sin clasificar'.", type: "imputation", montoARS: 15200, impacto: "bajo", fecha: "2024-03-17" },
  { id: "5", text: "Mano de obra: jornales reales superan +12% el costo unitario presupuestado para mampostería.", type: "deviation", montoARS: 210000, impacto: "alto", fecha: "2024-03-16" },
];

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
          Ordenado por: <span className="font-semibold text-foreground">Dinero · Tiempo · Impacto</span>
        </div>
      </div>

      {/* Sort mix stub */}
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        <strong>Mix de ordenamiento personalizable:</strong> sliders de Dinero / Tiempo / Impacto para rebalancear la prioridad de la cola. <em>(Phase 2)</em>
      </div>

      {/* Assumptions list */}
      <div className="space-y-3">
        {MOCK.map((a) => (
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
                <span className="text-xs text-muted-foreground ml-auto">{a.fecha}</span>
              </div>
              <p className="text-sm">{a.text}</p>
              <p className="mt-1 text-xs font-mono text-muted-foreground">
                Monto involucrado: ${a.montoARS.toLocaleString("es-AR")}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button className="inline-flex items-center gap-1.5 rounded-md bg-positive/15 px-3 py-1.5 text-xs font-semibold text-positive hover:bg-positive/25 transition-colors">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirmar
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/80 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk confirm */}
      <div className="flex justify-center">
        <button className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
          Confirmar todos los de bajo impacto (Pareto 90%)
        </button>
      </div>
    </div>
  );
}
