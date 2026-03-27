import { DollarSign, TrendingUp, AlertTriangle, Package } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import CashHealthIndicator from "@/components/CashHealthIndicator";
import BudgetChart from "@/components/BudgetChart";
import { useProject } from "@/contexts/ProjectContext";
import { dashboardByProject } from "@/data/projectData";

export default function Dashboard() {
  const { activeProject, projectsSource } = useProject();
  const data = dashboardByProject[activeProject.id];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {activeProject.name} — Resumen general
        </p>
      </div>

      {projectsSource === "api" && !data && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Métricas de demostración solo están cargadas para los proyectos de ejemplo. Este proyecto viene
          de la API; el tablero numérico se conectará cuando existan endpoints en el backend.
        </div>
      )}

      {!data ? null : (
        <>
      {/* Cash Health */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CashHealthIndicator
          status={data.cashStatus}
          label={data.cashLabel}
          detail={data.cashDetail}
        />
        <MetricCard
          label="Presupuesto total"
          value={data.presupuestoTotal}
          subtitle={data.presupuestoSubtitle}
          icon={DollarSign}
          flaky
        />
        <MetricCard
          label="Gastado a la fecha"
          value={data.gastado}
          subtitle={data.gastadoPct}
          icon={TrendingUp}
          trend="neutral"
        />
        <MetricCard
          label="Supuestos pendientes"
          value={String(data.supuestosPendientes)}
          subtitle={`${data.supuestosAlto} de alto impacto`}
          icon={AlertTriangle}
          trend="negative"
        />
      </div>

      {/* Budget vs Actual chart */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-bold mb-4">Presupuesto vs. Real — Top rubros</h2>
        <BudgetChart data={data.chartItems} />
      </div>

      {/* Recent assumptions */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-bold mb-3">Últimos supuestos del sistema</h2>
        <ul className="space-y-2">
          {data.recentAssumptions.map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-md border border-border px-4 py-3 text-sm"
            >
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">{a.text}</span>
              <div className="flex gap-2 shrink-0">
                <button className="rounded-md bg-positive/15 px-3 py-1 text-xs font-semibold text-positive hover:bg-positive/25 transition-colors">
                  Confirmar
                </button>
                <button className="rounded-md bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary/80 transition-colors">
                  Editar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
        </>
      )}
    </div>
  );
}
