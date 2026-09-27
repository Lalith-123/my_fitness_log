import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { NumberField } from '@/components/common/NumberField';
import { SelectField } from '@/components/common/SelectField';
import { ConfirmDialog } from '@/components/common/Dialog';
import { useToast } from '@/components/common/Toast';
import { FOOD_CATEGORIES } from '@/data/foods';
import {
  createUserFood,
  deleteUserFood,
  getResolvedFood,
  resetFoodOverride,
  updateFood,
  validateFoodInput,
  type FoodInput,
  type ResolvedFood,
} from '@/services/foods/foods';
import { parseNumericInput, round } from '@/utils/numbers/numbers';
import { EDIT_IMPACT_NOTE, FOOD_REFERENCE_NOTE } from './foodNotes';

export interface FoodEditorSheetProps {
  open: boolean;
  onClose: () => void;
  /** When set, the sheet edits this food instead of creating a new one. */
  food?: ResolvedFood | null;
  onSaved?: (food: ResolvedFood) => void;
  onDeleted?: () => void;
  /** Raised when the user chooses to log a freshly created food straight away. */
  onAddNowRequest?: (food: ResolvedFood) => void;
}

interface FormState {
  name: string;
  category: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  portionLabel: string;
  portionGrams: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  category: FOOD_CATEGORIES[0],
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  portionLabel: '',
  portionGrams: '',
};

function formFromFood(food: ResolvedFood): FormState {
  return {
    name: food.name,
    category: food.category,
    calories: String(food.caloriesPer100g),
    protein: String(food.proteinPer100g),
    carbs: String(food.carbsPer100g),
    fat: String(food.fatPer100g),
    fiber: String(food.fiberPer100g),
    portionLabel: food.portion?.label ?? '',
    portionGrams: food.portion ? String(food.portion.grams) : '',
  };
}

export function FoodEditorSheet({
  open,
  onClose,
  food,
  onSaved,
  onDeleted,
  onAddNowRequest,
}: FoodEditorSheetProps) {
  const { showToast } = useToast();
  const isEditing = Boolean(food);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingFood, setPendingFood] = useState<ResolvedFood | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(food ? formFromFood(food) : EMPTY_FORM);
    setErrors({});
    setFormError(null);
    setConfirmAdd(false);
    setConfirmDelete(false);
    setPendingFood(null);
  }, [open, food]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: null }));
    setFormError(null);
  };

  const parsed = useMemo(
    () => ({
      calories: parseNumericInput(form.calories),
      protein: parseNumericInput(form.protein),
      carbs: parseNumericInput(form.carbs),
      fat: parseNumericInput(form.fat),
      fiber: parseNumericInput(form.fiber),
    }),
    [form],
  );

  const nutritionComplete = Object.values(parsed).every((value) => value !== null);

  const buildInput = (): FoodInput | null => {
    if (!nutritionComplete) return null;
    const { calories, protein, carbs, fat, fiber } = parsed;
    if (
      calories === null ||
      protein === null ||
      carbs === null ||
      fat === null ||
      fiber === null
    ) {
      return null;
    }
    const portionGrams = parseNumericInput(form.portionGrams);
    return {
      name: form.name.trim(),
      category: form.category,
      caloriesPer100g: round(calories, 1),
      proteinPer100g: round(protein, 1),
      carbsPer100g: round(carbs, 1),
      fatPer100g: round(fat, 1),
      fiberPer100g: round(fiber, 1),
      portion:
        form.portionLabel.trim() && portionGrams && portionGrams > 0
          ? { label: form.portionLabel.trim(), grams: round(portionGrams, 0) }
          : undefined,
    };
  };

  const validate = (): FoodInput | null => {
    const nextErrors: Record<string, string | null> = {};

    if (form.name.trim() === '') nextErrors.name = 'Enter a food name.';

    if (!nutritionComplete) {
      nextErrors.calories = 'Enter a value for every nutrition field.';
    }

    const portionGrams = parseNumericInput(form.portionGrams);
    if (form.portionLabel.trim() && (portionGrams === null || portionGrams <= 0)) {
      nextErrors.portionGrams = 'Enter the portion weight in grams.';
    }

    setErrors(nextErrors);

    const input = Object.values(nextErrors).some(Boolean) ? null : buildInput();
    if (!input) return null;

    // Single source of truth for name/category/nutrition rules.
    const result = validateFoodInput(input);
    if (!result.ok) {
      setErrors({ calories: result.message ?? 'Check the nutrition values.' });
      return null;
    }
    return input;
  };

  const save = async (): Promise<void> => {
    const input = validate();
    if (!input) return;

    setSaving(true);
    setFormError(null);
    try {
      if (food) {
        const updated = await updateFood(food.id, input);
        showToast('Food updated.', 'success');
        onSaved?.(updated);
        onClose();
        return;
      }

      const created = await createUserFood(input);
      const resolved = await getResolvedFood(created.id);
      if (!resolved) throw new Error('The new food could not be read back. Please try again.');
      // The food is saved either way, so always ask what to do next rather
      // than assuming. Callers decide what "add to a meal" means for them.
      onSaved?.(resolved);
      onClose();
      setPendingFood(resolved);
      setConfirmAdd(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save this food.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavedChoice = (addNow: boolean) => {
    setConfirmAdd(false);
    const target = pendingFood;
    setPendingFood(null);
    if (!target) return;
    onSaved?.(target);
    if (addNow) {
      showToast(`${target.name} saved. Enter the amount to add it.`, 'success');
      onAddNowRequest?.(target);
    } else {
      showToast(`${target.name} saved to your foods.`, 'success');
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!food) return;
    setSaving(true);
    try {
      await deleteUserFood(food.id);
      showToast('Food deleted.', 'success');
      setConfirmDelete(false);
      onDeleted?.();
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete this food.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetOverride = async () => {
    if (!food) return;
    setSaving(true);
    try {
      await resetFoodOverride(food.id);
      const restored = await getResolvedFood(food.id);
      if (restored) {
        setForm(formFromFood(restored));
        showToast('Built-in values restored.', 'success');
        onSaved?.(restored);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to restore this food.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={isEditing ? 'Edit food' : 'Create food'}
        description="Values are per 100 g of edible portion."
        footer={
          <div className="flex flex-col gap-2">
            {formError ? (
              <p className="text-xs text-critical-700" role="alert">
                {formError}
              </p>
            ) : null}
            <Button variant="primary" size="lg" fullWidth onClick={save} disabled={saving}>
              {saving ? 'Saving' : isEditing ? 'Save changes' : 'Save food'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
          {food ? (
            <p className="rounded-md border border-line bg-surface-sunken px-3 py-2.5 text-[11px] leading-relaxed text-ink-muted">
              {EDIT_IMPACT_NOTE}
            </p>
          ) : null}

          <TextField
            label="Food name"
            value={form.name}
            onChange={(value) => update('name', value)}
            error={errors.name}
            placeholder="For example, homemade paratha"
            maxLength={80}
            required
          />

          <SelectField
            label="Category"
            value={form.category}
            onChange={(value) => update('category', value)}
            options={FOOD_CATEGORIES.map((category) => ({ value: category, label: category }))}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-ink">Nutrition per 100 g</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Calories"
                unit="kcal"
                value={form.calories}
                onChange={(value) => update('calories', value)}
                error={errors.calories}
                min={0}
                max={1000}
                step={1}
                required
              />
              <NumberField
                label="Protein"
                unit="g"
                value={form.protein}
                onChange={(value) => update('protein', value)}
                min={0}
                max={100}
                step={0.5}
                required
              />
              <NumberField
                label="Carbs"
                unit="g"
                value={form.carbs}
                onChange={(value) => update('carbs', value)}
                min={0}
                max={100}
                step={0.5}
                required
              />
              <NumberField
                label="Fat"
                unit="g"
                value={form.fat}
                onChange={(value) => update('fat', value)}
                min={0}
                max={100}
                step={0.5}
                required
              />
              <NumberField
                label="Fiber"
                unit="g"
                value={form.fiber}
                onChange={(value) => update('fiber', value)}
                min={0}
                max={50}
                step={0.5}
                required
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-subtle">{FOOD_REFERENCE_NOTE}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">Common portion (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Label"
                value={form.portionLabel}
                onChange={(value) => update('portionLabel', value)}
                placeholder="1 slice"
                maxLength={24}
              />
              <NumberField
                label="Weight"
                unit="g"
                value={form.portionGrams}
                onChange={(value) => update('portionGrams', value)}
                error={errors.portionGrams}
                min={1}
                max={2000}
                step={5}
                placeholder="30"
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-subtle">
              Adds a one-tap shortcut when logging. Nutrition is still calculated per 100 g.
            </p>
          </div>

          {food?.isOverridden ? (
            <Button variant="secondary" size="sm" onClick={handleResetOverride} disabled={saving}>
              Restore built-in values
            </Button>
          ) : null}

          {food?.isUserCreated ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} disabled={saving}>
              Delete this food
            </Button>
          ) : null}
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmAdd}
        title="Food saved"
        message="It has been added to your food list. You can add it to a meal now, or find it later by searching your foods."
        confirmLabel="Add to a meal"
        cancelLabel="Not now"
        onConfirm={() => handleSavedChoice(true)}
        onCancel={() => handleSavedChoice(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete food?"
        message="This removes the food from your list. Meals you already logged keep the values recorded at the time and are not affected."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
