export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function isFiniteNumberInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export interface FieldResult {
  ok: boolean;
  message?: string;
}

export const VALID = { ok: true } as const;

export function fail(message: string): FieldResult {
  return { ok: false, message };
}

export const LIMITS = {
  age: { min: 13, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 25, max: 350 },
  weeklyChangeKg: { min: 0.1, max: 1.5 },
  quantityGrams: { min: 1, max: 5000 },
  foodNameMaxLength: 80,
  caloriesPer100g: { min: 0, max: 1000 },
  macroPer100g: { min: 0, max: 100 },
  fiberPer100g: { min: 0, max: 50 },
} as const;

export function validateName(value: unknown): FieldResult {
  if (!isNonEmptyString(value)) return fail('Enter a name.');
  if (value.trim().length > 40) return fail('Use 40 characters or fewer.');
  return VALID;
}

export function validateAge(value: unknown): FieldResult {
  if (!isFiniteNumberInRange(value, LIMITS.age.min, LIMITS.age.max)) {
    return fail(`Enter an age between ${LIMITS.age.min} and ${LIMITS.age.max}.`);
  }
  return VALID;
}

export function validateHeightCm(value: unknown): FieldResult {
  if (!isFiniteNumberInRange(value, LIMITS.heightCm.min, LIMITS.heightCm.max)) {
    return fail(`Enter a height between ${LIMITS.heightCm.min} and ${LIMITS.heightCm.max} cm.`);
  }
  return VALID;
}

export function validateWeightKg(value: unknown): FieldResult {
  if (!isFiniteNumberInRange(value, LIMITS.weightKg.min, LIMITS.weightKg.max)) {
    return fail(`Enter a weight between ${LIMITS.weightKg.min} and ${LIMITS.weightKg.max} kg.`);
  }
  return VALID;
}

export function validateQuantityGrams(value: unknown): FieldResult {
  if (!isFiniteNumberInRange(value, LIMITS.quantityGrams.min, LIMITS.quantityGrams.max)) {
    return fail(`Enter a quantity between ${LIMITS.quantityGrams.min} and ${LIMITS.quantityGrams.max} g.`);
  }
  return VALID;
}

/**
 * Nutrition values are reference estimates. Reject negative, NaN and infinite
 * input; energy is additionally checked for internal consistency.
 */
export function validateNutritionFields(input: {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
}): FieldResult {
  const macros = [
    ['Calories', input.caloriesPer100g, LIMITS.caloriesPer100g.max],
    ['Protein', input.proteinPer100g, LIMITS.macroPer100g.max],
    ['Carbohydrates', input.carbsPer100g, LIMITS.macroPer100g.max],
    ['Fat', input.fatPer100g, LIMITS.macroPer100g.max],
    ['Fiber', input.fiberPer100g, LIMITS.fiberPer100g.max],
  ] as const;

  for (const [label, value, max] of macros) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return fail(`${label} must be zero or a positive number.`);
    }
    if (value > max) {
      return fail(`${label} per 100 g cannot be above ${max}.`);
    }
  }

  // Atwater factors. A large gap usually means a typo rather than a real food.
  const derived = input.proteinPer100g * 4 + input.carbsPer100g * 4 + input.fatPer100g * 9;
  if (derived > 0 && input.caloriesPer100g > 0) {
    const drift = Math.abs(input.caloriesPer100g - derived) / derived;
    if (drift > 0.35) {
      return fail('Calories do not closely match the protein, carbohydrate and fat values.');
    }
  }

  return VALID;
}

export function validateFoodName(value: unknown): FieldResult {
  if (!isNonEmptyString(value)) return fail('Enter a food name.');
  if (value.trim().length > LIMITS.foodNameMaxLength) {
    return fail(`Use ${LIMITS.foodNameMaxLength} characters or fewer.`);
  }
  return VALID;
}

export function sanitizeFilenamePart(value: string, fallback = 'user'): string {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return cleaned.length > 0 ? cleaned : fallback;
}
