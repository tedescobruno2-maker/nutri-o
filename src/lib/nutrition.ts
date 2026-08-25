/**
 * Motor de cálculo nutricional — Fase 3 do plano mestre. Funções puras, sem acesso ao banco:
 * recebe dados já carregados e nunca importa `prisma` nem `server-only`, porque precisa rodar
 * tanto no cliente (contador ao vivo do construtor de plano) quanto no servidor (materialização
 * no "Finalizar"). É a ÚNICA fonte de verdade de kcal do sistema — nenhum outro arquivo deve
 * multiplicar `kcal100` por quantidade.
 *
 * Regras duras (não negociáveis, ver 5.3.2 do plano mestre):
 * - `nutrientStatus = PENDENTE` nunca entra no somatório — contribui 0 e avisa.
 * - Fibra/macronutriente não medido na fonte (`null`) nunca vira `0` — `0` significa "medido e é
 *   zero", `null`/ausente significa "não sei".
 * - Quantidade não numérica ("A VONTADE", "PONTA DA FACA"...) nunca vira um número inventado.
 * - Uma "unidade" nunca é assumida como 100 g — só conta com `FoodMeasure` cadastrada.
 * - Nada aqui arredonda valor intermediário; arredondamento é só na exibição.
 */

export type CalcStatus = "CALCULADO" | "PARCIAL" | "FAIXA" | "NAO_CALCULAVEL";
export type BlockSeparator = "OU" | "LISTA";

export type Macros = { kcal: number; protein: number; carbs: number; fat: number; fiber?: number };
export type MacroRange = { min: Macros; max: Macros };

export type CalcWarning = { message: string; foodName?: string };

export type CalcResult = {
  range: MacroRange;
  status: CalcStatus;
  warnings: CalcWarning[];
  /** Só preenchido por calcMeal em refeições `separator=OU` com mais de uma opção: a dispersão
   * mín/máx entre TODAS as opções (o `range` principal continua sendo o da opção 1 — 5.3.2 regra 10). */
  allOptionsRange?: MacroRange;
};

/** Dados nutricionais de um alimento, já carregados (nunca um objeto Prisma bruto). */
export type FoodRef = {
  name: string;
  kcal100: number | null;
  protein100: number | null;
  carbs100: number | null;
  fat100: number | null;
  fiber100: number | null;
  nutrientStatus: "VALIDADO" | "PENDENTE";
};

/** Medida caseira já resolvida (`FoodMeasure`) — label + gramatura confirmada. */
export type MeasureRef = { label: string; grams: number };

/**
 * Quantidade de um item. Só uma das formas se aplica por vez:
 * - peso/volume direto: `quantity` em `unit` "g"/"ml" (ou `unit` ausente = grama).
 * - medida caseira: `quantity` = nº de unidades da medida, `measure` = a `FoodMeasure` resolvida.
 * - faixa: `quantity` (mínimo) + `quantityMax`, combinados com `unit` ou `measure` acima.
 * - não quantificável: `quantityText` preenchido ("A VONTADE", "PONTA DA FACA"...), `quantity` null.
 */
export type QuantityInput = {
  quantity: number | null;
  quantityMax?: number | null;
  unit?: string | null;
  measure?: MeasureRef | null;
  quantityText?: string | null;
};

export type FoodItemInput = { type: "ALIMENTO"; food: FoodRef } & QuantityInput;

export type RecipeIngredientInput = {
  food: FoodRef | null;
  description?: string | null;
} & QuantityInput;

export type RecipeItemInput = {
  type: "RECEITA";
  name: string;
  servings: number | null;
  ingredients: RecipeIngredientInput[];
};

export type ChoiceGroupOptionInput = {
  food: FoodRef | null;
  description?: string | null;
} & QuantityInput;

export type GroupItemInput = {
  type: "GRUPO_ESCOLHA";
  name: string;
  /** Do `ChoiceGroup.quantityText` — "A VONTADE" etc. aplica a regra 5 ao grupo inteiro. */
  quantityText?: string | null;
  options: ChoiceGroupOptionInput[];
};

/** Texto livre / suplemento no plano: nunca tem valor nutricional (não é o papel deste item). */
export type TextItemInput = { type: "TEXTO_LIVRE" | "SUPLEMENTO" };

export type ItemInput = FoodItemInput | RecipeItemInput | GroupItemInput | TextItemInput;

export type MealInput = {
  separator: BlockSeparator;
  visible: boolean;
  /** Resultado já calculado desta refeição (via calcMeal). */
  result: CalcResult;
};

// ---------------------------------------------------------------------------
// Palavras de alto impacto calórico — ingrediente de receita sem `foodId` some do somatório
// silenciosamente, EXCETO quando o texto livre bate em uma destas (regra 7, caso de teste 10).
// ---------------------------------------------------------------------------
const HIGH_IMPACT_WORDS = /azeite|óleo|oleo|manteiga|açúcar|acucar|mel\b/i;

const STATUS_PRIORITY: CalcStatus[] = ["NAO_CALCULAVEL", "PARCIAL", "FAIXA", "CALCULADO"];

function worstStatus(statuses: CalcStatus[]): CalcStatus {
  for (const s of STATUS_PRIORITY) {
    if (statuses.includes(s)) return s;
  }
  return "NAO_CALCULAVEL";
}

function zeroMacros(): Macros {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

function zeroResult(warnings: CalcWarning[] = []): CalcResult {
  const macros = zeroMacros();
  return { range: { min: macros, max: macros }, status: "NAO_CALCULAVEL", warnings };
}

function scaleMacros(food: FoodRef, grams: number): Macros {
  const factor = grams / 100;
  const macros: Macros = {
    kcal: (food.kcal100 as number) * factor,
    protein: (food.protein100 as number) * factor,
    carbs: (food.carbs100 as number) * factor,
    fat: (food.fat100 as number) * factor,
  };
  // Regra dura: fibra não medida (null) nunca vira 0 — fica ausente do objeto.
  if (food.fiber100 != null) macros.fiber = food.fiber100 * factor;
  return macros;
}

/**
 * Resolve a quantidade em gramas para um `quantity` numérico dado um `unit`/`measure`. Retorna
 * `null` quando a unidade é uma medida caseira sem `FoodMeasure` cadastrada (regras 2 e 3) — nesse
 * caso quem chama deve gerar `NAO_CALCULAVEL`, nunca assumir 100 g por unidade.
 */
function resolveGrams(quantity: number, q: QuantityInput): number | null {
  if (q.measure) return quantity * q.measure.grams;

  const unit = (q.unit ?? "g").trim().toLowerCase();
  const isWeightOrVolume = unit === "" || unit === "g" || unit === "gr" || unit === "grama" || unit === "gramas" || unit === "ml" || unit === "mililitro" || unit === "mililitros";
  if (isWeightOrVolume) return quantity;

  // Unidade tipo "unidade"/"und"/"fatia"/"colher de sopa"... sem FoodMeasure resolvida: nunca
  // assume 100 g nem qualquer outro valor — regra 3.
  return null;
}

/** Calcula um alimento com uma quantidade — o núcleo das regras 1 a 6, reutilizado por
 * `calcItem` (item ALIMENTO), pelos ingredientes de receita e pelas opções de grupo de escolha. */
function calcFoodQuantity(food: FoodRef, q: QuantityInput): CalcResult {
  // Regra 5: quantidade não numérica — nunca converte "à vontade" em número.
  if (q.quantity == null) {
    if (q.quantityText) {
      return zeroResult([{ message: `quantidade não numérica ("${q.quantityText}") para ${food.name} — não calculado`, foodName: food.name }]);
    }
    return zeroResult([{ message: `quantidade não informada para ${food.name} — não calculado`, foodName: food.name }]);
  }

  const gramsMin = resolveGrams(q.quantity, q);
  if (gramsMin == null) {
    const label = q.measure?.label ?? q.unit ?? "unidade";
    return zeroResult([{ message: `medida caseira "${label}" sem gramatura cadastrada para ${food.name}`, foodName: food.name }]);
  }

  const hasRange = q.quantityMax != null;
  const gramsMax = hasRange ? resolveGrams(q.quantityMax as number, q) : gramsMin;
  if (gramsMax == null) {
    const label = q.measure?.label ?? q.unit ?? "unidade";
    return zeroResult([{ message: `medida caseira "${label}" sem gramatura cadastrada para ${food.name}`, foodName: food.name }]);
  }

  // Regra 4: PENDENTE nunca entra no somatório — contribui 0, mas some com aviso (não silenciosamente).
  if (food.nutrientStatus === "PENDENTE") {
    return {
      ...zeroResult([{ message: `alimento sem valor nutricional confirmado (pendente): ${food.name}`, foodName: food.name }]),
      status: "PARCIAL",
    };
  }

  const macrosMin = scaleMacros(food, gramsMin);
  const macrosMax = hasRange ? scaleMacros(food, gramsMax) : macrosMin;

  return {
    range: { min: macrosMin, max: macrosMax },
    status: "CALCULADO",
    warnings: [],
  };
}

/** Item ALIMENTO isolado, receita, ou grupo de escolha — a unidade atômica do construtor. */
export function calcItem(item: ItemInput): CalcResult {
  switch (item.type) {
    case "ALIMENTO":
      return calcFoodQuantity(item.food, item);

    case "RECEITA":
      return calcRecipe(item);

    case "GRUPO_ESCOLHA":
      return calcGroup(item);

    case "TEXTO_LIVRE":
    case "SUPLEMENTO":
      return zeroResult();
  }
}

function calcRecipe(item: RecipeItemInput): CalcResult {
  const warnings: CalcWarning[] = [];
  const servings = item.servings ?? 1;
  if (item.servings == null) {
    warnings.push({ message: `receita "${item.name}" sem número de porções — assumindo 1 porção` });
  }

  const computed: CalcResult[] = [];
  for (const ingredient of item.ingredients) {
    if (!ingredient.food) {
      // Regra 7: ingrediente sem foodId some do somatório sem aviso, exceto palavra de alto impacto.
      if (ingredient.description && HIGH_IMPACT_WORDS.test(ingredient.description)) {
        warnings.push({ message: `ingrediente "${ingredient.description}" da receita "${item.name}" não tem alimento vinculado — pode ter impacto calórico relevante e não entrou no somatório` });
      }
      continue;
    }
    computed.push(calcFoodQuantity(ingredient.food, ingredient));
  }

  if (computed.length === 0) {
    return zeroResult([...warnings, { message: `receita "${item.name}" não tem nenhum ingrediente com alimento vinculado` }]);
  }

  const min = sumMacros(computed.map((c) => c.range.min), servings);
  const max = sumMacros(computed.map((c) => c.range.max), servings);
  const status = worstStatus(computed.map((c) => c.status));
  const allWarnings = [...warnings, ...computed.flatMap((c) => c.warnings)];

  return { range: { min, max }, status, warnings: allWarnings };
}

function calcGroup(item: GroupItemInput): CalcResult {
  // Regra 8 (via regra 5): grupo "A VONTADE" inteiro não é quantificável.
  if (item.quantityText && item.options.every((o) => o.quantity == null)) {
    return zeroResult([{ message: `quantidade não numérica ("${item.quantityText}") para o grupo "${item.name}" — não calculado` }]);
  }

  const computed = item.options
    .filter((o): o is ChoiceGroupOptionInput & { food: FoodRef } => o.food != null)
    .map((o) => ({ option: o, result: calcFoodQuantity(o.food, o) }));

  const calculable = computed.filter((c) => c.result.status === "CALCULADO");

  if (calculable.length === 0) {
    const warnings = computed.flatMap((c) => c.result.warnings);
    return zeroResult(warnings.length ? warnings : [{ message: `grupo "${item.name}" não tem nenhuma opção calculável` }]);
  }

  // Faixa de macros = a opção mais barata e a mais cara em kcal (D5) — não o mínimo/máximo de
  // cada macro isoladamente, que criaria um perfil que não corresponde a nenhuma opção real.
  const sorted = [...calculable].sort((a, b) => a.result.range.min.kcal - b.result.range.min.kcal);
  const cheapest = sorted[0].result.range.min;
  const priciest = sorted[sorted.length - 1].result.range.max;

  return {
    range: { min: cheapest, max: priciest },
    status: "FAIXA",
    warnings: computed.flatMap((c) => c.result.warnings),
  };
}

function sumMacros(list: Macros[], divideBy = 1): Macros {
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber: number | undefined;
  let anyFiber = false;
  for (const m of list) {
    kcal += m.kcal;
    protein += m.protein;
    carbs += m.carbs;
    fat += m.fat;
    if (m.fiber != null) {
      fiber = (fiber ?? 0) + m.fiber;
      anyFiber = true;
    }
  }
  const result: Macros = { kcal: kcal / divideBy, protein: protein / divideBy, carbs: carbs / divideBy, fat: fat / divideBy };
  if (anyFiber) result.fiber = (fiber as number) / divideBy;
  return result;
}

/** Soma os itens de uma opção de refeição. */
export function calcOption(items: ItemInput[]): CalcResult {
  if (items.length === 0) return zeroResult();

  const results = items.map((i) => calcItem(i));
  const min = sumMacros(results.map((r) => r.range.min));
  const max = sumMacros(results.map((r) => r.range.max));
  const status = worstStatus(results.map((r) => r.status));
  const warnings = results.flatMap((r) => r.warnings);

  return { range: { min, max }, status, warnings };
}

/**
 * Refeição = várias opções. `separator=LISTA` (ex.: TAREFAS INICIAIS) não tem valor nutricional e
 * é excluída do total sem gerar aviso (regra 11). `separator=OU`: o número principal é o da opção
 * 1 (regra 10); a dispersão entre todas as opções fica em `allOptionsRange`.
 */
export function calcMeal(options: CalcResult[], separator: BlockSeparator): CalcResult {
  if (separator === "LISTA") {
    return zeroResult();
  }

  if (options.length === 0) return zeroResult();

  const first = options[0];
  const allMins = options.map((o) => o.range.min);
  const allMaxs = options.map((o) => o.range.max);

  const allOptionsRange: MacroRange = {
    min: pickExtremeMacros(allMins, "min"),
    max: pickExtremeMacros(allMaxs, "max"),
  };

  return {
    range: first.range,
    // O número exibido é o da opção 1 (regra 10), mas o status reflete a pior opção do grupo —
    // se qualquer alternativa não é calculável, a confiabilidade da refeição cai, mesmo que a
    // opção 1 em si esteja OK (caso de teste 12).
    status: worstStatus(options.map((o) => o.status)),
    warnings: options.flatMap((o) => o.warnings),
    ...(options.length > 1 ? { allOptionsRange } : {}),
  };
}

/** Menor (ou maior) kcal entre um conjunto de Macros — junto com o resto do perfil daquele mesmo
 * ponto, pela mesma razão de calcGroup: não mistura macros de opções diferentes. */
function pickExtremeMacros(list: Macros[], extreme: "min" | "max"): Macros {
  return list.reduce((acc, m) => {
    const better = extreme === "min" ? m.kcal < acc.kcal : m.kcal > acc.kcal;
    return better ? m : acc;
  }, list[0]);
}

/**
 * Total do dia: soma as refeições `separator=OU` e `visible=true`, cada uma já usando sua opção 1
 * (regra 12). Refeições `LISTA` ou invisíveis são excluídas sem gerar aviso — blocos de treino
 * (regra 13) entram normalmente porque quem decide incluí-los ou não no dia é quem monta a lista
 * de `meals` (a tela "dia com treino / sem treino" da 9.6), não este motor.
 */
export function calcPlan(meals: MealInput[]): CalcResult {
  const included = meals.filter((m) => m.separator === "OU" && m.visible);
  if (included.length === 0) return zeroResult();

  const min = sumMacros(included.map((m) => m.result.range.min));
  const max = sumMacros(included.map((m) => m.result.range.max));
  const status = worstStatus(included.map((m) => m.result.status));
  const warnings = included.flatMap((m) => m.result.warnings);

  return { range: { min, max }, status, warnings };
}
