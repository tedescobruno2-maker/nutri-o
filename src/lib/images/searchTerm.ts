/**
 * Deriva um termo de busca de imagem a partir do nome de uma receita/alimento (5.10.3/5.11.2).
 * Remove o que atrapalha a busca em banco de imagem — forma de preparo quando não ajuda
 * visualmente, marca, gramatura/quantidade e adjetivos de dieta — e mantém só as
 * poucas palavras que descrevem o prato visualmente. Sempre editável antes de buscar
 * (5.11.2) — esta função só preenche a sugestão inicial, nunca busca sozinha.
 *
 * Ex.: "QUIBE DE CARNE COM COUVE FLOR" → "quibe carne couve flor"
 *      "IOGURTE NATURAL DANONE" → "iogurte natural"
 */

const DIET_WORDS = /\b(low ?carb|fit|diet|light|zero|caseiro|caseira|da vov[oó]|integral|sem gluten|sem gl[uú]ten|sem lactose|desnatad[oa]|sem a[cç][uú]car)\b/gi;
const CONNECTOR_WORDS = /\b(de|do|da|dos|das|com|e|ou|no|na|para|sem)\b/gi;
const QUANTITY_PATTERN = /\b\d+([.,]\d+)?\s*(g|gr|gramas?|ml|kg|colher(es)?|x|un(idades?)?)\b/gi;
const KNOWN_BRANDS = /\b(danone|nestl[eé]|yopro|verde campo|piracanjuba|itamb[eé]|vigor|activia)\b/gi;

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function suggestImageSearchTerm(name: string, maxWords = 4): string {
  let cleaned = stripAccents(name.toLowerCase());
  cleaned = cleaned.replace(QUANTITY_PATTERN, " ");
  cleaned = cleaned.replace(KNOWN_BRANDS, " ");
  cleaned = cleaned.replace(DIET_WORDS, " ");
  cleaned = cleaned.replace(/[^a-z\s]/g, " ");
  cleaned = cleaned.replace(CONNECTOR_WORDS, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  const words = cleaned.split(" ").filter(Boolean).slice(0, maxWords);
  return words.join(" ");
}
