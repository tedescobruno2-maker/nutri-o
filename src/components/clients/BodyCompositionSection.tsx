import { formatDateFull } from "@/lib/utils";
import type { Measurement } from "@/generated/prisma/client";

type Segment = { muscleKg?: number; fatKg?: number; fatLevelPercent?: number };
type Segmental = { trunk?: Segment; leftArm?: Segment; rightArm?: Segment; leftLeg?: Segment; rightLeg?: Segment };

export function BodyCompositionSection({ measurement }: { measurement: Measurement }) {
  const segmental = measurement.segmental as Segmental | null;

  const tiles: Array<{ label: string; value: string; icon: string }> = [
    { label: "% Gordura corporal", value: measurement.bodyFat != null ? `${measurement.bodyFat}%` : "—", icon: "🔥" },
    { label: "% Massa muscular", value: measurement.muscleMassPercent != null ? `${measurement.muscleMassPercent}%` : "—", icon: "💪" },
    { label: "% Água corporal", value: measurement.bodyWaterPercent != null ? `${measurement.bodyWaterPercent}%` : "—", icon: "💧" },
    { label: "IMC", value: measurement.bmi != null ? `${measurement.bmi}` : "—", icon: "📐" },
    { label: "TMB", value: measurement.bmr != null ? `${measurement.bmr} kcal` : "—", icon: "⚡" },
    { label: "Gordura visceral", value: measurement.visceralFat != null ? `${measurement.visceralFat}` : "—", icon: "🎯" },
    { label: "Massa óssea", value: measurement.boneMassKg != null ? `${measurement.boneMassKg} kg` : "—", icon: "🦴" },
    { label: "Pontuação geral", value: measurement.bioScore != null ? `${measurement.bioScore}` : "—", icon: "⭐" },
  ];

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="chart-card-header">
        <h3>Composição Corporal</h3>
        <span className="text-tertiary" style={{ fontSize: "0.78rem" }}>
          {measurement.source ? `${measurement.source} · ` : ""}
          {formatDateFull(measurement.date)}
        </span>
      </div>

      <div className="stat-grid">
        {tiles.map((tile) => (
          <div key={tile.label} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: "1.1rem", marginBottom: 4 }}>{tile.icon}</div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{tile.value}</div>
            <div className="text-tertiary" style={{ fontSize: "0.72rem" }}>{tile.label}</div>
          </div>
        ))}
      </div>

      {segmental && (
        <div style={{ overflowX: "auto" }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Análise segmentar</p>
          <table className="data-table" style={{ fontSize: "0.82rem" }}>
            <thead>
              <tr>
                <th></th>
                <th>Tronco</th>
                <th>Braço E</th>
                <th>Braço D</th>
                <th>Perna E</th>
                <th>Perna D</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Músculo (kg)</td>
                <td>{segmental.trunk?.muscleKg ?? "—"}</td>
                <td>{segmental.leftArm?.muscleKg ?? "—"}</td>
                <td>{segmental.rightArm?.muscleKg ?? "—"}</td>
                <td>{segmental.leftLeg?.muscleKg ?? "—"}</td>
                <td>{segmental.rightLeg?.muscleKg ?? "—"}</td>
              </tr>
              <tr>
                <td>Gordura (kg)</td>
                <td>{segmental.trunk?.fatKg ?? "—"}</td>
                <td>{segmental.leftArm?.fatKg ?? "—"}</td>
                <td>{segmental.rightArm?.fatKg ?? "—"}</td>
                <td>{segmental.leftLeg?.fatKg ?? "—"}</td>
                <td>{segmental.rightLeg?.fatKg ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
