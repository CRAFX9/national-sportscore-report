import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

/** Accepts any metric bag; undefined metrics are skipped (never charted as zero). */
export function MetricsRadar({ metrics }: { metrics: Record<string, number | undefined> }) {
  const data = Object.entries(metrics)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .map(([k, v]) => ({
      metric: k.charAt(0).toUpperCase() + k.slice(1),
      value: v as number,
    }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <Radar
            dataKey="value"
            stroke="var(--color-primary)"
            fill="var(--color-primary)"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
