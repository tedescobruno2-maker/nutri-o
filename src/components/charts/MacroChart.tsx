"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { formatDate } from "@/lib/utils";
import type { DietLog } from "@/generated/prisma/client";

const SERIES = [
  { key: "protein", label: "Proteína", color: "var(--viz-series-1)" },
  { key: "carbs", label: "Carboidrato", color: "var(--viz-series-2)" },
  { key: "fat", label: "Gordura", color: "var(--viz-series-3)" },
] as const;

export function MacroChart({ dietLogs }: { dietLogs: DietLog[] }) {
  const data = dietLogs
    .filter((d) => d.protein != null || d.carbs != null || d.fat != null)
    .map((d) => ({
      label: formatDate(d.weekStart),
      protein: d.protein ?? 0,
      carbs: d.carbs ?? 0,
      fat: d.fat ?? 0,
    }));

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <span style={{ fontSize: "1.8rem" }}>🥑</span>
        <p>Nenhum registro de macronutrientes ainda.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="chart-legend" style={{ marginBottom: 10 }}>
        {SERIES.map((s) => (
          <span key={s.key} className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--viz-ink-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--viz-grid)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--viz-ink-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
            label={{ value: "g/dia", angle: -90, position: "insideLeft", fill: "var(--viz-ink-muted)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "var(--viz-grid)" }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                dateLabel={label}
                rows={
                  payload?.map((p) => ({
                    label: SERIES.find((s) => s.key === p.dataKey)?.label ?? String(p.dataKey),
                    value: `${p.value}g`,
                    color: (p.color as string) ?? "var(--viz-series-1)",
                  })) ?? []
                }
              />
            )}
          />
          <Bar dataKey="protein" stackId="macros" fill="var(--viz-series-1)" maxBarSize={24} />
          <Bar dataKey="carbs" stackId="macros" fill="var(--viz-series-2)" maxBarSize={24} />
          <Bar dataKey="fat" stackId="macros" fill="var(--viz-series-3)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
