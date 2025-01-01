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
  recentAssumptions: { text: string; type: "imputation" | "alert" | "deviation" }[];
}

const torreBelgrano: DashboardData = {
  cashStatus: "ok",
  cashLabel: "Caja OK",
  cashDetail: "Margen proyectado: 12.4%",
  presupuestoTotal: "$14.850.000",
  presupuestoSubtitle: "ARS — incluye 3 rubros sin confirmar",
  gastado: "$9.650.000",
  gastadoPct: "64.9% del presupuesto",
  supuestosPendientes: 17,
  supuestosAlto: 4,
  chartItems: [
    { name: "Hormigón H21", presupuesto: 4800000, real: 3200000 },
    { name: "Acero ADN 420", presupuesto: 3200000, real: 2900000 },
    { name: "Mampostería", presupuesto: 1600000, real: 1100000 },
    { name: "Encofrado", presupuesto: 900000, real: 650000 },
    { name: "Mano de obra est.", presupuesto: 2100000, real: 1800000 },
  ],
  recentAssumptions: [
    { text: "Imputé $340.000 de acero a Losa Nivel 3", type: "imputation" },
    { text: "Precio del cemento tiene 6 meses — actualizar?", type: "alert" },
    { text: "Consumo de ladrillos excede dosificación +8%", type: "deviation" },
  ],
};

const nordeltaPh3: DashboardData = {
  cashStatus: "warning",
  cashLabel: "Caja ajustada",
  cashDetail: "Margen proyectado: 4.1% — revisar desvíos",
  presupuestoTotal: "$38.200.000",
  presupuestoSubtitle: "ARS — 5 rubros pendientes de cotización",
  gastado: "$29.100.000",
  gastadoPct: "76.2% del presupuesto",
  supuestosPendientes: 24,
  supuestosAlto: 9,
  chartItems: [
    { name: "Hormigón H25", presupuesto: 9200000, real: 8400000 },
    { name: "Acero ADN 420", presupuesto: 6100000, real: 6800000 },
    { name: "Curtain wall", presupuesto: 5400000, real: 4200000 },
    { name: "Instalación eléc.", presupuesto: 3800000, real: 3500000 },
    { name: "Mano de obra est.", presupuesto: 4600000, real: 4900000 },
  ],
  recentAssumptions: [
    { text: "Acero excede presupuesto en $700K — solicitar aprobación", type: "deviation" },
    { text: "M.O. estructura supera estimado +6.5%", type: "deviation" },
    { text: "Cotización curtain wall vence en 15 días", type: "alert" },
    { text: "Imputé $520.000 de inst. eléctrica a Planta Baja", type: "imputation" },
  ],
};

export const dashboardByProject: Record<string, DashboardData> = {
  "torre-belgrano": torreBelgrano,
  "nordelta-ph3": nordeltaPh3,
};
