export const PLAN_SLOTS = ["Desjejum", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"] as const;

// Rótulo curto de cada horário — usado nos chips de seleção (PlanBuilder, MealSlotPicker) e nos
// badges de Receitas/Biblioteca de Textos que carregam esses horários como tag persistente.
export const PLAN_SLOT_SHORT: Record<string, string> = {
  Desjejum: "Café",
  "Lanche da Manhã": "Manhã",
  Almoço: "Almoço",
  "Lanche da Tarde": "Tarde",
  Jantar: "Jantar",
  Ceia: "Ceia",
};

export function parseMealSlots(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function serializeMealSlots(slots: string[]): string | null {
  return slots.length > 0 ? slots.join(",") : null;
}
