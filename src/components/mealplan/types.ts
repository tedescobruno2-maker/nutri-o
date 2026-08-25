import type { Food, Recipe, RecipeIngredient, FoodMeasure, ChoiceGroup, ChoiceGroupItem } from "@/generated/prisma/client";

export type RecipeIngredientView = RecipeIngredient & { food: Food | null };
export type RecipeView = Recipe & { ingredientItems: RecipeIngredientView[] };
export type ChoiceGroupItemView = ChoiceGroupItem & { food: Food | null };
export type ChoiceGroupView = ChoiceGroup & { items: ChoiceGroupItemView[] };

export type MealOptionItemView = {
  id: string;
  itemType: string;
  description: string | null;
  literalText: string | null;
  quantity: number | null;
  quantityMax: number | null;
  quantityText: string | null;
  unit: string | null;
  showPhoto: boolean;
  food: Food | null;
  foodMeasure: FoodMeasure | null;
  recipe: RecipeView | null;
  choiceGroup: ChoiceGroupView | null;
};

export type MealOptionView = {
  id: string;
  label: string;
  freeText: string;
  isStructured: boolean;
  items: MealOptionItemView[];
};

export type MealView = {
  id: string;
  name: string;
  blockType: string;
  displayTitle: string | null;
  suggestedTime: string | null;
  separator: string;
  visible: boolean;
  options: MealOptionView[];
};
