export type Sex = 'male' | 'female' | 'other';

export type GoalType = 'lose' | 'maintain' | 'gain';

export type GoalStatus = 'active' | 'completed';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export type UnitSystem = 'metric';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Accent palettes. Only the brand ramp changes; status and macro hues are fixed. */
export type AccentPreference = 'bubblegum' | 'sky' | 'mint' | 'peach' | 'grape';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
  /**
   * Daily energy figures the user supplied themselves, in kcal per day, for
   * when they have measured numbers that beat the estimate. Absent means "use
   * the calculated value".
   */
  bmrOverride?: number;
  tdeeOverride?: number;
  targetOverride?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  type: GoalType;
  startingWeightKg: number;
  targetWeightKg: number;
  weeklyChangeKg?: number;
  status: GoalStatus;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Food {
  id: string;
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  /**
   * Optional convenience portion used as a quick-add chip in the quantity step,
   * for example `{ label: '1 roti', grams: 45 }`. Purely a UI convenience: all
   * nutrition is still stored and calculated per 100 g.
   */
  portion?: { label: string; grams: number };
  isDefault: boolean;
  isUserCreated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FoodOverride {
  id: string;
  foodId: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  createdAt: string;
  updatedAt: string;
}

export interface Meal {
  id: string;
  date: string;
  mealType: MealType;
  createdAt: string;
}

export interface MealItem {
  id: string;
  mealId: string;
  foodId: string;
  foodNameSnapshot: string;
  quantityGrams: number;
  /**
   * Per 100 g values captured at the time of logging. Changing the amount later
   * rescales from these, so editing a food never rewrites past entries.
   */
  per100g: Per100gNutrition;
  caloriesSnapshot: number;
  proteinSnapshot: number;
  carbsSnapshot: number;
  fatSnapshot: number;
  fiberSnapshot: number;
  createdAt: string;
}

export interface WeightLog {
  id: string;
  date: string;
  weightKg: number;
  createdAt: string;
}

export interface AppSettings {
  id: 'app';
  theme: ThemePreference;
  accent: AccentPreference;
  units: UnitSystem;
  disclaimerAcceptedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetadataEntry {
  key: string;
  value: string;
}

export interface FavoriteEntry {
  foodId: string;
  createdAt: string;
}

export interface RecentFoodEntry {
  foodId: string;
  usedAt: string;
}

/** Nutrition values for a given quantity of food. All values are absolute (not per 100g). */
export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export const EMPTY_NUTRITION: NutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

/** Nutrition per 100 g of a food, the basis every quantity is scaled from. */
export interface Per100gNutrition {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
}

export const EMPTY_PER_100G: Per100gNutrition = {
  caloriesPer100g: 0,
  proteinPer100g: 0,
  carbsPer100g: 0,
  fatPer100g: 0,
  fiberPer100g: 0,
};
