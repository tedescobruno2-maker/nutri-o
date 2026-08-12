"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { formatDate } from "@/lib/utils";
import type { DietLog } from "@/generated/prisma/client";

export function AdherenceChart({ dietLogs }: { dietLogs: DietLog[] }) {
  const data = dietLogs.map((d) => ({
    label: formatDate(d.weekStart),
    adherence: d.adherence,
  }));

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <span style={{ fontSize: "1.8rem" }}>🎯</span>
        <p>Nenhum registro de adesão à dieta ainda.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="adherenceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-series-1)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--viz-series-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--viz-ink-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--viz-grid)" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fill: "var(--viz-ink-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={38}
        />
        <Tooltip
          cursor={{ stroke: "var(--viz-grid)" }}
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              dateLabel={label}
              rows={
                payload?.[0]
                  ? [{ label: "Adesão", value: `${payload[0].value}%`, color: "var(--viz-series-1)" }]
                  : []
              }
            />
          )}
        />
        <Area
          type="monotone"
          dataKey="adherence"
          stroke="var(--viz-series-1)"
          strokeWidth={2}
          fill="url(#adherenceFill)"
          dot={{ r: 4, fill: "var(--viz-series-1)", stroke: "var(--bg-elevated)", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
