import type { Food } from '@/types';
import type { FoodCategory, FoodSeed } from './types';
import { GRAIN_FOODS } from './grains';
import { BREAD_FOODS } from './breads';
import { BREAKFAST_FOODS } from './breakfast';
import { RICE_FOODS } from './rice';
import { DAL_FOODS } from './dal';
import { INDIAN_DISH_FOODS } from './dishes';
import { VEGETABLE_FOODS } from './vegetables';
import { FRUIT_FOODS } from './fruits';
import { DAIRY_FOODS } from './dairy';
import { MEAT_FOODS } from './meat';
import { SEAFOOD_FOODS } from './seafood';
import { EGG_FOODS } from './eggs';
import { PROTEIN_FOODS } from './protein';
import { NUT_FOODS } from './nuts';
import { SNACK_FOODS } from './snacks';
import { BEVERAGE_FOODS } from './beverages';
import { FAT_FOODS } from './fats';

export * from './types';

/** A convenience portion used only as a quick-add chip in the quantity step. */
export interface FoodPortion {
  label: string;
  grams: number;
}

export const FOOD_SEEDS: FoodSeed[] = [
  ...GRAIN_FOODS,
  ...BREAD_FOODS,
  ...BREAKFAST_FOODS,
  ...RICE_FOODS,
  ...DAL_FOODS,
  ...INDIAN_DISH_FOODS,
  ...VEGETABLE_FOODS,
  ...FRUIT_FOODS,
  ...DAIRY_FOODS,
  ...MEAT_FOODS,
  ...SEAFOOD_FOODS,
  ...EGG_FOODS,
  ...PROTEIN_FOODS,
  ...NUT_FOODS,
  ...SNACK_FOODS,
  ...BEVERAGE_FOODS,
  ...FAT_FOODS,
];

/** Deterministic, stable ids so re-seeding never duplicates a row. */
function seedId(name: string, category: string): string {
  const slug = `${name}-${category}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `seed_${slug}`;
}

function parsePortion(raw: string | undefined): FoodPortion | undefined {
  if (!raw) return undefined;
  const [label, grams] = raw.split('|');
  const value = Number(grams);
  if (!label || !Number.isFinite(value) || value <= 0) return undefined;
  return { label: label.trim(), grams: value };
}

function buildDefaultFoods(): Food[] {
  const seen = new Set<string>();
  return FOOD_SEEDS.map((seed, index) => {
    const [name, category, calories, protein, carbs, fat, fiber, portion] = seed;
    const id = seedId(name, category);
    if (seen.has(id)) {
      // Ids are the primary key, so a colliding seed would break bulkAdd.
      throw new Error(`Duplicate food seed: "${name}" in category "${category}".`);
    }
    seen.add(id);
    const timestamp = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, index)).toISOString();
    return {
      id,
      name,
      category: category as FoodCategory,
      caloriesPer100g: calories,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
      fiberPer100g: fiber,
      portion: parsePortion(portion),
      isDefault: true,
      isUserCreated: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

export const DEFAULT_FOODS: Food[] = buildDefaultFoods();

export const DEFAULT_FOOD_COUNT = DEFAULT_FOODS.length;
