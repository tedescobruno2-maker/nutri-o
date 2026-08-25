import { describe, it, expect } from "vitest";
import { calcItem, calcOption, calcMeal, calcPlan, type FoodRef, type CalcResult } from "./nutrition";

function food(overrides: Partial<FoodRef> = {}): FoodRef {
  return {
    name: "Alimento Teste",
    kcal100: 150,
    protein100: 10,
    carbs100: 20,
    fat100: 5,
    fiber100: 2,
    nutrientStatus: "VALIDADO",
    ...overrides,
  };
}

describe("Fase 3 — os 13 casos de teste obrigatórios (5.3.4)", () => {
  it("1. alimento 100 g, macros validados -> valor exato, CALCULADO", () => {
    const r = calcItem({ type: "ALIMENTO", food: food(), quantity: 100, unit: "g" });
    expect(r.status).toBe("CALCULADO");
    expect(r.range.min).toEqual({ kcal: 150, protein: 10, carbs: 20, fat: 5, fiber: 2 });
    expect(r.range.max).toEqual(r.range.min);
  });

  it("2. alimento 250 g -> proporcional (2,5x), CALCULADO", () => {
    const r = calcItem({ type: "ALIMENTO", food: food(), quantity: 250, unit: "g" });
    expect(r.status).toBe("CALCULADO");
    expect(r.range.min).toEqual({ kcal: 375, protein: 25, carbs: 50, fat: 12.5, fiber: 5 });
  });

  it("3. 3 unidades de ovo com FoodMeasure(1 unidade, 50 g) -> base de 150 g, CALCULADO", () => {
    const ovo = food({ name: "Ovo", kcal100: 155, protein100: 13, carbs100: 1.1, fat100: 11, fiber100: 0 });
    const r = calcItem({ type: "ALIMENTO", food: ovo, quantity: 3, measure: { label: "1 unidade", grams: 50 } });
    expect(r.status).toBe("CALCULADO");
    expect(r.range.min.kcal).toBeCloseTo(155 * 1.5);
    expect(r.range.min.fiber).toBe(0); // medido e é zero — não é o mesmo que ausente
  });

  it("4. 2 fatias de pão sem FoodMeasure -> NAO_CALCULAVEL + aviso nomeando o alimento", () => {
    const pao = food({ name: "Pão de forma" });
    const r = calcItem({ type: "ALIMENTO", food: pao, quantity: 2, unit: "fatia" });
    expect(r.status).toBe("NAO_CALCULAVEL");
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.message.includes("Pão de forma"))).toBe(true);
  });

  it("5. alimento PENDENTE, 200 g -> contribui 0, PARCIAL, aviso", () => {
    const pendente = food({ name: "Alimento Novo", kcal100: null, protein100: null, carbs100: null, fat100: null, fiber100: null, nutrientStatus: "PENDENTE" });
    const r = calcItem({ type: "ALIMENTO", food: pendente, quantity: 200, unit: "g" });
    expect(r.status).toBe("PARCIAL");
    expect(r.range.min).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
    expect(r.range.min.fiber).toBeUndefined();
    expect(r.warnings.some((w) => w.message.includes("Alimento Novo"))).toBe(true);
  });

  it('6. quantityText = "A VONTADE" -> contribui 0, NAO_CALCULAVEL, aviso', () => {
    const r = calcItem({ type: "ALIMENTO", food: food(), quantity: null, quantityText: "A VONTADE" });
    expect(r.status).toBe("NAO_CALCULAVEL");
    expect(r.range.min).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("7. faixa 160 a 180 g de frango -> min ≠ max, ambos corretos", () => {
    const frango = food({ name: "Frango", kcal100: 165, protein100: 31, carbs100: 0, fat100: 3.6, fiber100: 0 });
    const r = calcItem({ type: "ALIMENTO", food: frango, quantity: 160, quantityMax: 180, unit: "g" });
    expect(r.range.min.kcal).toBeCloseTo(165 * 1.6);
    expect(r.range.max.kcal).toBeCloseTo(165 * 1.8);
    expect(r.range.min.kcal).not.toBe(r.range.max.kcal);
  });

  it("8. receita com 3 ingredientes, servings = 4 -> soma ÷ 4, CALCULADO", () => {
    const a = food({ name: "A", kcal100: 100 });
    const b = food({ name: "B", kcal100: 200 });
    const c = food({ name: "C", kcal100: 300 });
    const r = calcItem({
      type: "RECEITA",
      name: "Receita Teste",
      servings: 4,
      ingredients: [
        { food: a, quantity: 100, unit: "g" },
        { food: b, quantity: 100, unit: "g" },
        { food: c, quantity: 100, unit: "g" },
      ],
    });
    expect(r.status).toBe("CALCULADO");
    expect(r.range.min.kcal).toBeCloseTo((100 + 200 + 300) / 4);
  });

  it('9. receita com "sal a gosto" sem foodId -> ignorado SEM aviso', () => {
    const a = food({ name: "A", kcal100: 100 });
    const r = calcItem({
      type: "RECEITA",
      name: "Receita com sal",
      servings: 1,
      ingredients: [
        { food: a, quantity: 100, unit: "g" },
        { food: null, description: "sal a gosto", quantity: null },
      ],
    });
    expect(r.warnings.some((w) => w.message.toLowerCase().includes("sal"))).toBe(false);
  });

  it('10. receita com "azeite a gosto" sem foodId -> ignorado COM aviso', () => {
    const a = food({ name: "A", kcal100: 100 });
    const r = calcItem({
      type: "RECEITA",
      name: "Receita com azeite",
      servings: 1,
      ingredients: [
        { food: a, quantity: 100, unit: "g" },
        { food: null, description: "azeite a gosto", quantity: null },
      ],
    });
    expect(r.warnings.some((w) => w.message.toLowerCase().includes("azeite"))).toBe(true);
  });

  it("11. grupo Carboidrato com 6 itens de kcal distintas -> FAIXA, min = menor, max = maior", () => {
    const kcals = [50, 80, 110, 140, 170, 200];
    const r = calcItem({
      type: "GRUPO_ESCOLHA",
      name: "Carboidrato",
      options: kcals.map((k, i) => ({ food: food({ name: `Opção ${i}`, kcal100: k }), quantity: 100, unit: "g" })),
    });
    expect(r.status).toBe("FAIXA");
    expect(r.range.min.kcal).toBeCloseTo(50);
    expect(r.range.max.kcal).toBeCloseTo(200);
  });

  it("12. refeição com 3 opções, uma NAO_CALCULAVEL -> valor da opção 1; status = pior opção; faixa exposta", () => {
    const option1: CalcResult = { range: { min: { kcal: 300, protein: 20, carbs: 30, fat: 10 }, max: { kcal: 300, protein: 20, carbs: 30, fat: 10 } }, status: "CALCULADO", warnings: [] };
    const option2: CalcResult = { range: { min: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, max: { kcal: 0, protein: 0, carbs: 0, fat: 0 } }, status: "NAO_CALCULAVEL", warnings: [{ message: "x" }] };
    const option3: CalcResult = { range: { min: { kcal: 400, protein: 25, carbs: 40, fat: 15 }, max: { kcal: 400, protein: 25, carbs: 40, fat: 15 } }, status: "CALCULADO", warnings: [] };

    const r = calcMeal([option1, option2, option3], "OU");
    expect(r.range).toEqual(option1.range);
    expect(r.status).toBe("NAO_CALCULAVEL");
    expect(r.allOptionsRange?.min.kcal).toBe(0);
    expect(r.allOptionsRange?.max.kcal).toBe(400);
  });

  it("13. alimento TACO com fibra null (não medida) -> fibra ausente no total, NUNCA 0", () => {
    const semFibraMedida = food({ name: "Alimento sem fibra medida", fiber100: null });
    const r = calcItem({ type: "ALIMENTO", food: semFibraMedida, quantity: 100, unit: "g" });
    expect(r.range.min.fiber).toBeUndefined();
    expect("fiber" in r.range.min).toBe(false);
  });
});

describe("regras adicionais de 5.3.2", () => {
  it("regra 11: refeição separator=LISTA não tem valor nutricional e é excluída sem aviso", () => {
    const r = calcMeal([{ range: { min: { kcal: 999, protein: 0, carbs: 0, fat: 0 }, max: { kcal: 999, protein: 0, carbs: 0, fat: 0 } }, status: "CALCULADO", warnings: [] }], "LISTA");
    expect(r.status).toBe("NAO_CALCULAVEL");
    expect(r.range.min.kcal).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it("regra 12: calcPlan soma só as refeições separator=OU e visible=true", () => {
    const mealA: CalcResult = { range: { min: { kcal: 300, protein: 20, carbs: 30, fat: 10 }, max: { kcal: 300, protein: 20, carbs: 30, fat: 10 } }, status: "CALCULADO", warnings: [] };
    const mealB: CalcResult = { range: { min: { kcal: 500, protein: 30, carbs: 50, fat: 20 }, max: { kcal: 500, protein: 30, carbs: 50, fat: 20 } }, status: "CALCULADO", warnings: [] };
    const mealHidden: CalcResult = { range: { min: { kcal: 10_000, protein: 0, carbs: 0, fat: 0 }, max: { kcal: 10_000, protein: 0, carbs: 0, fat: 0 } }, status: "CALCULADO", warnings: [] };

    const total = calcPlan([
      { separator: "OU", visible: true, result: mealA },
      { separator: "OU", visible: true, result: mealB },
      { separator: "OU", visible: false, result: mealHidden },
      { separator: "LISTA", visible: true, result: { range: { min: { kcal: 5, protein: 0, carbs: 0, fat: 0 }, max: { kcal: 5, protein: 0, carbs: 0, fat: 0 } }, status: "CALCULADO", warnings: [] } },
    ]);

    expect(total.range.min.kcal).toBe(800);
  });

  it("calcOption soma os itens e status é o pior entre eles", () => {
    const a = food({ name: "A", kcal100: 100 });
    const pendente = food({ name: "B", kcal100: null, protein100: null, carbs100: null, fat100: null, fiber100: null, nutrientStatus: "PENDENTE" });
    const r = calcOption([
      { type: "ALIMENTO", food: a, quantity: 100, unit: "g" },
      { type: "ALIMENTO", food: pendente, quantity: 100, unit: "g" },
    ]);
    expect(r.status).toBe("PARCIAL");
    expect(r.range.min.kcal).toBeCloseTo(100);
  });
});
