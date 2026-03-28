import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

interface BudgetItem {
    name: string
    presupuesto: number
    real: number
}

export default function BudgetChart({ data }: { data: BudgetItem[] }) {
    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barCategoryGap="20%">
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                />
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fontFamily: 'var(--font-sans)' }}
                    stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                    tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v: number) =>
                        `$${(v / 1000000).toFixed(1)}M`
                    }
                />
                <Tooltip
                    formatter={(value: number) =>
                        `$${value.toLocaleString('es-AR')}`
                    }
                    contentStyle={{
                        borderRadius: '0.5rem',
                        border: '1px solid hsl(var(--border))',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                    }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                    dataKey="presupuesto"
                    name="Presupuesto"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                />
                <Bar
                    dataKey="real"
                    name="Real"
                    fill="hsl(var(--positive))"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}
