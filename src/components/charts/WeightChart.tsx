"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { formatDate } from "@/lib/utils";
import type { Measurement } from "@/generated/prisma/client";

export function WeightChart({ measurements }: { measurements: Measurement[] }) {
  const data = measurements.map((m) => ({
    date: m.date,
    label: formatDate(m.date),
    weight: m.weight,
  }));

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <span style={{ fontSize: "1.8rem" }}>⚖️</span>
        <p>Nenhuma medição de peso registrada ainda.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
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
          width={48}
          tickFormatter={(v: number) => v.toFixed(1)}
          domain={["dataMin - 2", "dataMax + 2"]}
        />
        <Tooltip
          cursor={{ stroke: "var(--viz-grid)" }}
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              dateLabel={label}
              rows={
                payload?.[0]
                  ? [{ label: "Peso", value: `${payload[0].value} kg`, color: "var(--viz-series-1)" }]
                  : []
              }
            />
          )}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="var(--viz-series-1)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--viz-series-1)", stroke: "var(--bg-elevated)", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
