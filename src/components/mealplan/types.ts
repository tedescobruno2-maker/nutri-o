import type { Food, Recipe } from "@/generated/prisma/client";

export type MealOptionItemView = {
  id: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  food: Food | null;
  recipe: Recipe | null;
};

export type MealOptionView = {
  id: string;
  label: string;
  freeText: string;
  items: MealOptionItemView[];
};

export type MealView = {
  id: string;
  name: string;
  options: MealOptionView[];
};
