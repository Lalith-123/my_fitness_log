export const FOOD_CATEGORIES = [
  'Grains & Cereals',
  'Rice & Biryani',
  'Roti & Bread',
  'Breakfast',
  'Dal & Sambar',
  'Indian Dishes',
  'Vegetables',
  'Fruits',
  'Dairy',
  'Meat',
  'Fish & Seafood',
  'Eggs',
  'Protein Foods',
  'Nuts & Seeds',
  'Snacks & Sweets',
  'Beverages',
  'Fats & Oils',
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

/**
 * Compact seed format.
 *
 * Every food is stored as nutrition per 100 g, matching the application's data
 * model. The optional last field is a convenience portion shown as a quick-add
 * chip in the quantity step, written as `"label|grams"` (for example
 * `"1 roti|40"`). It changes nothing about how nutrition is calculated.
 *
 * Reference estimates only. Real values vary with recipe, brand, portion and
 * cooking method.
 */
export type FoodSeed = readonly [
  name: string,
  category: FoodCategory,
  caloriesPer100g: number,
  proteinPer100g: number,
  carbsPer100g: number,
  fatPer100g: number,
  fiberPer100g: number,
  portion?: string,
];
