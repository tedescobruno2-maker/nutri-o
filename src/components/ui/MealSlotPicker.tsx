"use client";

import { PLAN_SLOTS, PLAN_SLOT_SHORT } from "@/lib/planSlots";

/** Chips de horário de refeição (Café/Manhã/Almoço/Tarde/Jantar/Ceia) — mesmo visual dos chips
 * de PlanBuilder.tsx, reaproveitado nos formulários de Receita e de Texto (Biblioteca) pra marcar
 * de forma persistente pra quais horários aquele item costuma servir. */
export function MealSlotPicker({ selected, onChange, name }: { selected: string[]; onChange: (slots: string[]) => void; name?: string }) {
  function toggle(slot: string) {
    onChange(selected.includes(slot) ? selected.filter((s) => s !== slot) : [...selected, slot]);
  }

  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {name && <input type="hidden" name={name} value={selected.join(",")} />}
      {PLAN_SLOTS.map((slot) => {
        const active = selected.includes(slot);
        return (
          <button
            key={slot}
            type="button"
            className={active ? "plan-slot-chip plan-slot-chip-active" : "plan-slot-chip"}
            onClick={() => toggle(slot)}
            title={`${active ? "Remover" : "Adicionar"} horário: ${slot}`}
          >
            {active ? "✓ " : "+ "}
            {PLAN_SLOT_SHORT[slot]}
          </button>
        );
      })}
    </div>
  );
}

export function MealSlotBadges({ mealSlots }: { mealSlots: string | null }) {
  if (!mealSlots) return null;
  const slots = mealSlots.split(",").map((s) => s.trim()).filter(Boolean);
  if (slots.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {slots.map((slot) => (
        <span key={slot} className="badge badge-neutral" style={{ fontSize: "0.66rem" }}>
          {PLAN_SLOT_SHORT[slot] ?? slot}
        </span>
      ))}
    </div>
  );
}
