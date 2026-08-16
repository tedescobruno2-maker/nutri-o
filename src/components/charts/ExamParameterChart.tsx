"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { formatDate } from "@/lib/utils";

type Point = {
  date: Date | string;
  value: number;
  flag: string;
};

const DOT_COLOR: Record<string, string> = {
  NORMAL: "var(--viz-series-1)",
  ATENCAO: "var(--viz-series-3)",
  INDETERMINADO: "var(--viz-ink-muted)",
};

export function ExamParameterChart({
  points,
  unit,
  referenceMin,
  referenceMax,
}: {
  points: Point[];
  unit: string;
  referenceMin?: number | null;
  referenceMax?: number | null;
}) {
  const data = points.map((p) => ({
    label: formatDate(p.date),
    value: p.value,
    flag: p.flag,
  }));

  const values = data.map((d) => d.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const padding = Math.max((dataMax - dataMin) * 0.15, 1);
  const domainMin = Math.min(dataMin, referenceMin ?? dataMin) - padding;
  const domainMax = Math.max(dataMax, referenceMax ?? dataMax) + padding;

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
        {referenceMin != null && referenceMax != null && (
          <ReferenceArea y1={referenceMin} y2={referenceMax} fill="var(--viz-series-1)" fillOpacity={0.08} />
        )}
        <XAxis dataKey="label" tick={{ fill: "var(--viz-ink-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--viz-grid)" }} tickLine={false} />
        <YAxis
          tick={{ fill: "var(--viz-ink-muted)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={40}
          domain={[domainMin, domainMax]}
        />
        <Tooltip
          cursor={{ stroke: "var(--viz-grid)" }}
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              dateLabel={label}
              rows={
                payload?.[0]
                  ? [{ label: "Valor", value: `${payload[0].value} ${unit}`, color: DOT_COLOR[(payload[0].payload as { flag: string }).flag] ?? "var(--viz-series-1)" }]
                  : []
              }
            />
          )}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--viz-series-2)"
          strokeWidth={2}
          dot={(props: { cx?: number; cy?: number; payload?: { flag: string }; index?: number }) => {
            const { cx, cy, payload, index } = props;
            const color = DOT_COLOR[payload?.flag ?? "INDETERMINADO"] ?? "var(--viz-ink-muted)";
            return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill={color} stroke="var(--bg-elevated)" strokeWidth={1.5} />;
          }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
