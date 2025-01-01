import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "positive" | "negative" | "neutral";
  flaky?: boolean;
}

export default function MetricCard({ label, value, subtitle, icon: Icon, trend, flaky }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <Icon
            className={cn(
              "h-5 w-5",
              trend === "positive" && "text-positive",
              trend === "negative" && "text-negative",
              !trend && "text-muted-foreground"
            )}
          />
        )}
      </div>
      <p
        className={cn(
          "text-2xl font-bold font-mono tracking-tight",
          trend === "positive" && "text-positive",
          trend === "negative" && "text-negative",
          flaky && "data-flaky"
        )}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
