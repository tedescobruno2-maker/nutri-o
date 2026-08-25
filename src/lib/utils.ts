export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const FOOD_PREPARATION_LABELS: Record<string, string> = {
  NAO_APLICA: "Padrão",
  CRU: "Cru",
  COZIDO: "Cozido",
  ASSADO: "Assado",
  GRELHADO: "Grelhado",
  REFOGADO: "Refogado",
  FRITO: "Frito",
  MEXIDO: "Mexido",
  OMELETE: "Omelete",
  PURE: "Purê",
  VAPOR: "No vapor",
  DESIDRATADO: "Desidratado",
  EM_PO: "Em pó",
};

export const MEAL_BLOCK_TYPE_LABELS: Record<string, string> = {
  AO_ACORDAR: "Ao acordar",
  DESJEJUM: "Desjejum",
  COLACAO: "Colação",
  PRE_TREINO: "Pré-treino",
  INTRA_TREINO: "Intra-treino",
  POS_TREINO: "Pós-treino",
  ALMOCO: "Almoço",
  SOBREMESA: "Sobremesa",
  LANCHE_TARDE: "Lanche da tarde",
  JANTAR_LANCHE: "Jantar/Lanche",
  CEIA: "Ceia",
  HIDRATACAO: "Hidratação",
  TAREFAS_INICIAIS: "Tarefas iniciais",
  RECEITAS_EXTRAS: "Receitas extras",
  LIVRE: "Bloco livre",
};

/** Ordem inicial ao criar plano novo (5.4.2), derivada dos 10 planos reais. */
export const MEAL_BLOCK_TYPE_DEFAULT_ORDER = [
  "AO_ACORDAR",
  "DESJEJUM",
  "COLACAO",
  "HIDRATACAO",
  "PRE_TREINO",
  "ALMOCO",
  "SOBREMESA",
  "POS_TREINO",
  "LANCHE_TARDE",
  "JANTAR_LANCHE",
  "CEIA",
  "TAREFAS_INICIAIS",
  "RECEITAS_EXTRAS",
] as const;

/** Começam ocultos — aparecem em só 3 dos 10 planos reais (5.4.2). */
export const MEAL_BLOCK_TYPE_STARTS_HIDDEN = new Set(["COLACAO", "SOBREMESA", "POS_TREINO", "INTRA_TREINO", "CEIA"]);

export const CALC_STATUS_LABELS: Record<string, string> = {
  CALCULADO: "Calculado",
  PARCIAL: "Parcial",
  FAIXA: "Faixa",
  NAO_CALCULAVEL: "Não calculável",
};

export const NUTRIENT_SOURCE_LABELS: Record<string, string> = {
  TACO: "TACO",
  IBGE_POF: "IBGE/POF",
  USDA: "USDA",
  ROTULO: "Rótulo",
  MANUAL: "Manual",
  IMPORTADO_PENDENTE: "Importado (pendente)",
};

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(d);
}

export function formatDateFull(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/** Calcula a idade a partir da data de nascimento, na data informada (padrão: hoje). */
export function calculateAge(birthDate: Date | string, atDate: Date | string = new Date()): number {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const at = typeof atDate === "string" ? new Date(atDate) : atDate;
  let age = at.getFullYear() - birth.getFullYear();
  const monthDiff = at.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < birth.getDate())) age--;
  return age;
}

/** Calcula o IMC (kg/m²) a partir do peso (kg) e altura (cm). */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/** Monta um link wa.me com mensagem pré-preenchida a partir de um telefone brasileiro em qualquer formato. */
export function buildWhatsAppLink(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, "");
  // Remove zero à esquerda do DDD (ex: "027..." → "27...") e adiciona o código do Brasil se ausente.
  digits = digits.replace(/^0+/, "");
  if (!digits.startsWith("55") || digits.length <= 11) {
    digits = `55${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const KANBAN_STATUSES = [
  "NOVOS",
  "EM_AVALIACAO",
  "PLANO_ENTREGUE",
  "ACOMPANHAMENTO",
] as const;

export type KanbanStatusValue = (typeof KANBAN_STATUSES)[number];

export const KANBAN_LABELS: Record<KanbanStatusValue, string> = {
  NOVOS: "Novos",
  EM_AVALIACAO: "Em Avaliação",
  PLANO_ENTREGUE: "Plano Entregue",
  ACOMPANHAMENTO: "Acompanhamento",
};

export const KANBAN_ICONS: Record<KanbanStatusValue, string> = {
  NOVOS: "✨",
  EM_AVALIACAO: "🔍",
  PLANO_ENTREGUE: "📋",
  ACOMPANHAMENTO: "📈",
};

export const MAIN_GOALS = [
  "EMAGRECIMENTO",
  "ESTETICA",
  "DESEMPENHO_ESPORTIVO",
  "REEDUCACAO_ALIMENTAR",
  "ENCAMINHADO_MEDICO",
] as const;

export type MainGoalValue = (typeof MAIN_GOALS)[number];

export const MAIN_GOAL_LABELS: Record<MainGoalValue, string> = {
  EMAGRECIMENTO: "Emagrecimento",
  ESTETICA: "Estética",
  DESEMPENHO_ESPORTIVO: "Desempenho esportivo",
  REEDUCACAO_ALIMENTAR: "Reeducação alimentar",
  ENCAMINHADO_MEDICO: "Encaminhado pelo médico",
};

export const SLEEP_QUALITY_OPTIONS = ["Insônia", "Dorme cedo", "Dorme tarde - depois das 23h", "Outro"];

export const GUT_HEALTH_OPTIONS = [
  "Faz cocô todos os dias",
  "Dia sim/dia não",
  "Constipada(o)",
  "Muitos gases",
  "Diarreia com frequência",
  "Outro",
];

export const CONSULTATION_FORM_STATUS_LABELS: Record<string, string> = {
  PENDING: "Não enviado",
  SENT: "Aguardando resposta",
  COMPLETED: "Respondido",
};

const RECIPE_EMOJI_RULES: Array<[RegExp, string]> = [
  [/salmão|peixe|atum|ômega|tilápia|linguado/i, "🐟"],
  [/frango|peito de frango/i, "🍗"],
  [/ovo|omelete|clara/i, "🥚"],
  [/smoothie|suco|shake|vitamina/i, "🥤"],
  [/panqueca|aveia|banana/i, "🥞"],
  [/salada|grão-de-bico|legum/i, "🥗"],
  [/quinoa|bowl/i, "🍲"],
  [/hambúrguer|hamburguer|carne/i, "🍔"],
  [/sopa|caldo/i, "🍜"],
  [/lasanha|berinjela|abobrinha/i, "🍆"],
  [/granola|semente/i, "🌾"],
  [/molho/i, "🫙"],
];

export function pickRecipeEmoji(name: string, tags?: string | null) {
  const haystack = `${name} ${tags ?? ""}`;
  for (const [pattern, emoji] of RECIPE_EMOJI_RULES) {
    if (pattern.test(haystack)) return emoji;
  }
  return "🍽️";
}
