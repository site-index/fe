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

interface ChartRow {
    name: string
    budget: number
    actual: number
}

const CHART_HEIGHT_PX = 280
const MILLION = 1_000_000
const ONE_DECIMAL_PLACE = 1
const BAR_RADIUS_PX = 4
const ZERO_RADIUS_PX = 0

export default function BudgetChart({ data }: { data: ChartRow[] }) {
    return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
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
                        `$${(v / MILLION).toFixed(ONE_DECIMAL_PLACE)}M`
                    }
                />
                <Tooltip
                    formatter={(value: number) =>
                        `$${value.toLocaleString('en-US')}`
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
                    dataKey="budget"
                    name="Budget"
                    fill="hsl(var(--primary))"
                    radius={[
                        BAR_RADIUS_PX,
                        BAR_RADIUS_PX,
                        ZERO_RADIUS_PX,
                        ZERO_RADIUS_PX,
                    ]}
                />
                <Bar
                    dataKey="actual"
                    name="Actual"
                    fill="hsl(var(--positive))"
                    radius={[
                        BAR_RADIUS_PX,
                        BAR_RADIUS_PX,
                        ZERO_RADIUS_PX,
                        ZERO_RADIUS_PX,
                    ]}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}
