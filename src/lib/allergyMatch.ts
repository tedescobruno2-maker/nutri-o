import { foodMatchKey } from "./foodMatch";

/**
 * Alerta de restrição (5.4.6) — casamento por texto contra `Client.allergies`/`intolerances`/
 * `dietaryRestrictions`/`foodAversions`. Puramente auxiliar: "Lactose" não casa com "queijo minas"
 * por comparação de string. Nunca trate um resultado `null` como "seguro comprovado", só como
 * "nada bateu pelo texto".
 */
export type RestrictionField = "allergies" | "intolerances" | "dietaryRestrictions" | "foodAversions";
export type RestrictionMatch = { field: RestrictionField; term: string };

export const RESTRICTION_FIELD_LABELS: Record<RestrictionField, string> = {
  allergies: "Alergia",
  intolerances: "Intolerância",
  dietaryRestrictions: "Restrição alimentar",
  foodAversions: "Aversão alimentar",
};

export type ClientRestrictions = {
  allergies?: string | null;
  intolerances?: string | null;
  dietaryRestrictions?: string | null;
  foodAversions?: string | null;
};

const FIELDS: RestrictionField[] = ["allergies", "intolerances", "dietaryRestrictions", "foodAversions"];

export function findRestrictionConflict(itemText: string, client: ClientRestrictions): RestrictionMatch | null {
  const itemKey = foodMatchKey(itemText);
  if (!itemKey) return null;

  for (const field of FIELDS) {
    const raw = client[field];
    if (!raw) continue;
    const terms = raw
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    for (const term of terms) {
      const termKey = foodMatchKey(term);
      if (!termKey) continue;
      if (itemKey.includes(termKey) || termKey.includes(itemKey)) {
        return { field, term };
      }
    }
  }
  return null;
}

/** Lista achatada de todas as restrições cadastradas, para a faixa fixa no cabeçalho do construtor. */
export function listAllRestrictions(client: ClientRestrictions): Array<{ field: RestrictionField; term: string }> {
  const out: Array<{ field: RestrictionField; term: string }> = [];
  for (const field of FIELDS) {
    const raw = client[field];
    if (!raw) continue;
    for (const term of raw.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean)) {
      out.push({ field, term });
    }
  }
  return out;
}
