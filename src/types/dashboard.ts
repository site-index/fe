/** Response from GET /v1/projects/:id/dashboard */
export interface DashboardData {
  cashStatus: "ok" | "warning" | "critical";
  cashLabel: string;
  cashDetail: string;
  presupuestoTotal: string;
  presupuestoSubtitle: string;
  gastado: string;
  gastadoPct: string;
  supuestosPendientes: number;
  supuestosAlto: number;
  chartItems: { name: string; presupuesto: number; real: number }[];
  recentAssumptions: {
    text: string;
    type: "imputation" | "alert" | "deviation";
  }[];
}
