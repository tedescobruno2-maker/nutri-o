export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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
