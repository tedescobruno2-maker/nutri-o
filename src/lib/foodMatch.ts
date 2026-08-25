/**
 * Chave canônica para busca/casamento de nomes de alimento — nunca para exibição (o nome exibido
 * é sempre o original). Resolve grafias divergentes nos planos reais (MAMÃO/MAMAO,
 * BRÓCOLIS/BROCOLIS, TILAPIA/TILÁPIA...): minúsculas → remove acentos → remove hífen/espaço
 * duplicado → singularização simples (plural em "s").
 */
export function foodMatchKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/s$/, ""); // singularização simples
}
