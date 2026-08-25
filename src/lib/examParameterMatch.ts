/**
 * Casamento de nome de parâmetro (texto livre extraído por IA de um laudo, ex.: "Dosagem de
 * Ácido Úrico") com o catálogo curado `ExamParameter` (ex.: canonicalName "Ácido úrico",
 * aliases "Dosagem de Ácido Úrico|..."). Usado tanto no seed (para sugerir aliases a partir dos
 * nomes reais já no banco) quanto no importador (`actions/examResults.ts`, 5.7.3) para resolver
 * `ExamResult.parameterId`.
 */

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizeParamName(s: string): string {
  return stripAccents(s.toLowerCase())
    .replace(/[()/\-.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compara um nome candidato (já normalizado) com um nome canônico/alias bruto. Nomes curtos
 * (siglas como "LH", "TSH") exigem casar como token inteiro — senão "LH" combinaria com qualquer
 * string que contenha as letras "lh" em sequência. Nomes mais longos usam contenção de substring
 * nos dois sentidos. Guarda extra: negação "não/nao" só de um lado nunca casa (evita, por
 * exemplo, "Colesterol Não-HDL" colar em "HDL"). */
export function namesMatch(candidateRaw: string, canonicalOrAliasRaw: string): boolean {
  const candidate = normalizeParamName(candidateRaw);
  const canonical = normalizeParamName(canonicalOrAliasRaw);
  if (!candidate || !canonical) return false;

  const candidateTokens = candidate.split(" ");
  const canonicalTokens = canonical.split(" ");
  const candidateHasNegation = candidateTokens.includes("nao");
  const canonicalHasNegation = canonicalTokens.includes("nao");
  if (candidateHasNegation !== canonicalHasNegation) return false;

  if (canonical.length <= 4) {
    return candidateTokens.includes(canonical);
  }
  return candidate.includes(canonical) || canonical.includes(candidate);
}

/** Tenta casar `rawName` contra uma lista de parâmetros do catálogo (cada um com canonicalName e
 * aliases já separados por "|"). Retorna o primeiro parâmetro cujo canonicalName ou algum alias
 * bate — ou `null` se nada casar (fica pendente de catalogação, nunca é erro). */
export function matchExamParameter<T extends { canonicalName: string; aliases: string | null }>(
  rawName: string,
  catalog: T[]
): T | null {
  for (const param of catalog) {
    if (namesMatch(rawName, param.canonicalName)) return param;
    const aliasList = param.aliases ? param.aliases.split("|") : [];
    if (aliasList.some((alias) => namesMatch(rawName, alias))) return param;
  }
  return null;
}
