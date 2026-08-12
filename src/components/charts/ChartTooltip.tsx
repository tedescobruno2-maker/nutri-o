"use client";

type Row = { label: string; value: string; color: string };

export function ChartTooltip({
  active,
  dateLabel,
  rows,
}: {
  active?: boolean;
  dateLabel?: string | number;
  rows: Row[];
}) {
  if (!active) return null;
  return (
    <div className="chart-tooltip">
      {dateLabel != null && <div className="chart-tooltip-date">{dateLabel}</div>}
      {rows.map((row) => (
        <div key={row.label} className="chart-tooltip-row">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              className="chart-legend-swatch"
              style={{ background: row.color, width: 8, height: 8 }}
            />
            {row.label}
          </span>
          <strong style={{ color: "var(--text-primary)" }}>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}
