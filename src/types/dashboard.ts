/** Response from GET /v1/projects/:id/dashboard */
export interface DashboardData {
    cashStatus: 'ok' | 'warning' | 'critical'
    cashLabel: string
    cashDetail: string
    budgetTotal: string
    budgetSubtitle: string
    spent: string
    spentPercent: string
    openAssumptionsCount: number
    highImpactAssumptionsCount: number
    chartRows: { name: string; budget: number; actual: number }[]
    recentAssumptions: {
        text: string
        type: 'imputation' | 'alert' | 'deviation'
    }[]
}
