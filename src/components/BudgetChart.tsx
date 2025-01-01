import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface BudgetItem {
  name: string;
  presupuesto: number;
  real: number;
}

export default function BudgetChart({ data }: { data: BudgetItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 88%)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fontFamily: "Inter" }}
          stroke="hsl(180 10% 45%)"
        />
        <YAxis
          tick={{ fontSize: 11, fontFamily: "Roboto Mono" }}
          stroke="hsl(180 10% 45%)"
          tickFormatter={(v: number) =>
            `$${(v / 1000000).toFixed(1)}M`
          }
        />
        <Tooltip
          formatter={(value: number) =>
            `$${value.toLocaleString("es-AR")}`
          }
          contentStyle={{
            borderRadius: "0.5rem",
            border: "1px solid hsl(0 0% 88%)",
            fontFamily: "Roboto Mono",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="presupuesto" name="Presupuesto" fill="hsl(180 25% 25%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="real" name="Real" fill="hsl(150 100% 50%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
