import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Plus, Search, Star } from 'lucide-react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { NumberField } from '@/components/common/NumberField';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { EmptyState } from '@/components/common/EmptyState';
import { IconButton } from '@/components/common/IconButton';
import { FoodRow } from './FoodRow';
import { FoodEditorSheet } from './FoodEditorSheet';
import { useFoodCategories, useFoodIndex, useFoodSearch, type FoodBrowseTab } from '@/hooks/useFoods';
import { addMealItem, MEAL_LABELS, updateMealItemQuantity } from '@/services/meals/meals';
import { calculateFoodNutrition } from '@/services/nutrition/nutrition';
import { toggleFavorite } from '@/services/foods/foods';
import { useToast } from '@/components/common/Toast';
import { formatCalories, formatGrams, parseNumericInput } from '@/utils/numbers/numbers';
import { MEAL_TYPES, type MealItem, type MealType, type NutritionTotals } from '@/types';
import type { ResolvedFood } from '@/services/foods/foods';

export interface FoodPickerSheetProps {
  open: boolean;
  onClose: () => void;
  date: string;
  defaultMealType: MealType;
  onAdded?: (item: { foodName: string; nutrition: NutritionTotals; mealType: MealType }) => void;
  /** Pre-select a food and open directly on the quantity step. */
  initialFoodId?: string | null;
  /**
   * When set, the sheet edits this logged item instead of adding a new one.
   * The quantity is taken from the item and saving overwrites its values.
   */
  editItem?: MealItem | null;
}

const TABS: { value: FoodBrowseTab; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'favorites', label: 'Favourites' },
  { value: 'all', label: 'All' },
  { value: 'categories', label: 'Categories' },
];

function suggestMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export function FoodPickerSheet({
  open,
  onClose,
  date,
  defaultMealType,
  onAdded,
  initialFoodId,
  editItem,
}: FoodPickerSheetProps) {
  const { showToast } = useToast();
  const index = useFoodIndex();
  const categories = useFoodCategories(index.foods);

  const [step, setStep] = useState<'browse' | 'quantity'>('browse');
  const [tab, setTab] = useState<FoodBrowseTab>('recent');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const [selected, setSelected] = useState<ResolvedFood | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [mealType, setMealType] = useState<MealType>(defaultMealType ?? suggestMealType());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const browseState = useMemo(
    () => ({ tab, query, category }),
    [tab, query, category],
  );
  const results = useFoodSearch(index, browseState);

  // Reset whenever the sheet opens so a previous session never leaks through.
  useEffect(() => {
    if (!open) return;
    setStep('browse');
    setQuery('');
    setCategory(null);
    setError(null);
    setMealType(defaultMealType ?? suggestMealType());
    setSelected(null);
    setQuantity('100');
    // Recent is the fastest path back for a returning user, but it is empty for
    // a new one, so fall back to the full list rather than an empty state.
    setTab(index.recentFoods.length > 0 ? 'recent' : 'all');
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 220);
    return () => window.clearTimeout(timer);
  }, [open, defaultMealType, index.recentFoods.length]);

  // Editing a logged item opens straight on the quantity step with its own amount.
  useEffect(() => {
    if (!open || !editItem) return;
    const food = index.byId.get(editItem.foodId);
    if (!food) return;
    setSelected(food);
    setQuantity(String(editItem.quantityGrams));
    setStep('quantity');
    setError(null);
  }, [open, editItem, index.byId]);

  useEffect(() => {
    if (!open || !initialFoodId || editItem) return;
    const food = index.byId.get(initialFoodId);
    if (food) {
      setSelected(food);
      setQuantity(String(food.portion?.grams ?? 100));
      setStep('quantity');
    }
  }, [open, initialFoodId, editItem, index.byId]);

  const selectedNutrition = useMemo(() => {
    if (!selected) return null;
    const grams = parseNumericInput(quantity);
    if (grams === null || grams <= 0) return null;
    return calculateFoodNutrition(selected, grams);
  }, [selected, quantity]);

  const openQuantity = (food: ResolvedFood) => {
    setSelected(food);
    setQuantity(String(food.portion?.grams ?? 100));
    setStep('quantity');
    setError(null);
  };

  const handleToggleFavorite = async (food: ResolvedFood) => {
    const isFavorite = index.favoriteIds.includes(food.id);
    try {
      await toggleFavorite(food.id, isFavorite);
    } catch {
      showToast('Unable to update favourite.', 'caution');
    }
  };

  const handleAdd = async () => {
    if (!selected) return;
    const grams = parseNumericInput(quantity);
    if (grams === null || grams <= 0) {
      setError('Enter a quantity greater than zero.');
      return;
    }
    if (grams > 5000) {
      setError('Enter a quantity below 5000 g.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const nutrition = {
        caloriesPer100g: selected.caloriesPer100g,
        proteinPer100g: selected.proteinPer100g,
        carbsPer100g: selected.carbsPer100g,
        fatPer100g: selected.fatPer100g,
        fiberPer100g: selected.fiberPer100g,
      };

      if (editItem) {
        await updateMealItemQuantity(editItem.id, grams);
        showToast(`${selected.name} updated.`, 'success');
        setSelected(null);
        setQuantity('100');
        setStep('browse');
        onClose();
        return;
      }

      const item = await addMealItem({
        date,
        mealType,
        foodId: selected.id,
        foodName: selected.name,
        quantityGrams: grams,
        nutrition,
      });
      onAdded?.({
        foodName: selected.name,
        nutrition: {
          calories: item.caloriesSnapshot,
          protein: item.proteinSnapshot,
          carbs: item.carbsSnapshot,
          fat: item.fatSnapshot,
          fiber: item.fiberSnapshot,
        },
        mealType,
      });
      showToast(`${selected.name} added to ${MEAL_LABELS[mealType].toLowerCase()}.`, 'success');
      setSelected(null);
      setQuery('');
      setStep('browse');
      window.setTimeout(() => searchInputRef.current?.focus(), 60);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this food. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const showCategories = tab === 'categories' && !query.trim() && !category;
  const isEmpty = results.length === 0 && !showCategories;

  return (
    <>
      <BottomSheet
        open={open && !editorOpen}
        onClose={onClose}
        title={
          step === 'browse' ? (editItem ? 'Change this entry' : 'Add food') : editItem ? 'Edit this entry' : 'Log this food'
        }
        description={
          step === 'browse'
            ? 'Search, or pick something you eat often.'
            : 'Nutrition is calculated from the per 100 g values.'
        }
        headerAction={
          step === 'quantity' ? (
            <IconButton
              label="Back to search"
              size="sm"
              onClick={() => {
                setStep('browse');
                setSelected(null);
              }}
            >
              <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
            </IconButton>
          ) : (
            <IconButton label="Create a new food" size="sm" onClick={() => setEditorOpen(true)}>
              <Plus size={17} strokeWidth={2} aria-hidden="true" />
            </IconButton>
          )
        }
        footer={
          step === 'quantity' && selected ? (
            <div className="flex flex-col gap-2">
              {error ? (
                <p className="text-xs text-critical-700" role="alert">
                  {error}
                </p>
              ) : null}
              <Button variant="primary" size="lg" fullWidth onClick={handleAdd} disabled={saving}>
                {saving
                  ? 'Saving'
                  : editItem
                    ? `Update to ${selectedNutrition ? formatCalories(selectedNutrition.calories) : ''} kcal`
                    : `Add ${selectedNutrition ? formatCalories(selectedNutrition.calories) : ''} kcal to ${MEAL_LABELS[mealType]}`}
              </Button>
            </div>
          ) : undefined
        }
      >
        {step === 'browse' ? (
          <div className="flex flex-col">
            <div className="sticky top-0 z-10 border-b border-line bg-surface px-4 pb-3 pt-3 sm:px-5">
              <div className="relative">
                <Search
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search foods"
                  aria-label="Search foods"
                  className="h-11 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-[15px] text-ink placeholder:text-ink-subtle"
                />
              </div>
              <div className="mt-2.5">
                <SegmentedControl
                  label="Food source"
                  size="sm"
                  fullWidth
                  value={tab}
                  onChange={(value) => {
                    setTab(value);
                    setCategory(null);
                  }}
                  options={TABS}
                />
              </div>
            </div>

            <div className="px-4 pt-2 pb-4 sm:px-5">
              {showCategories ? (
                <div className="flex flex-col gap-3 py-2">
                  <p className="text-[11px] text-ink-subtle">
                    {index.foods.length} foods across {categories.length} categories
                  </p>
                  <ul className="grid grid-cols-2 gap-2">
                    {categories.map((entry) => (
                      <li key={entry.category}>
                        <button
                          type="button"
                          onClick={() => {
                            setCategory(entry.category);
                            setTab('all');
                          }}
                          className="flex w-full items-baseline justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-sunken"
                        >
                          <span className="min-w-0 truncate text-sm text-ink">{entry.category}</span>
                          <span className="shrink-0 text-[11px] text-ink-subtle tnum">{entry.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {category && !query.trim() ? (
                <div className="flex items-center justify-between gap-2 py-2">
                  <p className="text-[11px] text-ink-subtle">{results.length} in {category}</p>
                  <button
                    type="button"
                    onClick={() => setCategory(null)}
                    className="text-[11px] font-medium text-brand-700"
                  >
                    Clear category
                  </button>
                </div>
              ) : null}

              {isEmpty ? (
                <div className="py-3">
                  <EmptyState
                    compact
                    title={tab === 'favorites' ? 'No favourites yet' : 'No foods found'}
                    description={
                      tab === 'favorites'
                        ? 'Tap the star beside a food to keep it here for quick access.'
                        : 'Try a shorter search, or create the food with your own values.'
                    }
                    actionLabel={query.trim() ? 'Create this food' : undefined}
                    onAction={query.trim() ? () => setEditorOpen(true) : undefined}
                  />
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {results.map((food) => (
                    <FoodRow
                      key={food.id}
                      food={food}
                      onSelect={openQuantity}
                      isFavorite={index.favoriteIds.includes(food.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </ul>
              )}

              {!isEmpty && !showCategories ? (                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-ink-subtle hover:text-ink"
                >
                  <Plus size={15} strokeWidth={2} aria-hidden="true" />
                  Create a new food
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 'quantity' && selected ? (
          <div className="flex flex-col gap-5 px-4 py-4 sm:px-5">
            <div className="rounded-lg border border-line bg-surface-sunken px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{selected.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-subtle tnum">
                    {selected.caloriesPer100g} kcal per 100 g &middot; {selected.category}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(selected)}
                  aria-label={
                    index.favoriteIds.includes(selected.id)
                      ? `Remove ${selected.name} from favourites`
                      : `Add ${selected.name} to favourites`
                  }
                  aria-pressed={index.favoriteIds.includes(selected.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors hover:text-ink"
                >
                  <Star
                    size={16}
                    strokeWidth={2}
                    fill={index.favoriteIds.includes(selected.id) ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            <NumberField
              label="Quantity"
              unit="g"
              value={quantity}
              onChange={(value) => {
                setQuantity(value);
                setError(null);
              }}
              min={1}
              max={5000}
              step={selected.portion && selected.portion.grams < 20 ? 1 : 10}
              autoFocus
              onEnter={handleAdd}
              hint="Type a weight in grams, or use a common portion below."
            />

            {selected.portion ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(String(selected.portion?.grams ?? 100))}
                  className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-sunken"
                >
                  {selected.portion.label}
                </button>
                {[50, 100, 150, 200]
                  .filter((grams) => grams !== selected.portion?.grams)
                  .slice(0, 3)
                  .map((grams) => (
                    <button
                      key={grams}
                      type="button"
                      onClick={() => setQuantity(String(grams))}
                      className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink tnum"
                    >
                      {grams} g
                    </button>
                  ))}
              </div>
            ) : null}

            {selectedNutrition ? (
              <div className="rounded-lg border border-line bg-surface">
                <div className="flex items-baseline justify-between border-b border-line px-3.5 py-2.5">
                  <span className="text-sm text-ink-muted">Energy</span>
                  <span className="text-sm font-semibold text-ink tnum">
                    {formatCalories(selectedNutrition.calories)} kcal
                  </span>
                </div>
                <dl className="grid grid-cols-4 divide-x divide-line">
                  {(
                    [
                      ['Protein', selectedNutrition.protein],
                      ['Carbs', selectedNutrition.carbs],
                      ['Fat', selectedNutrition.fat],
                      ['Fiber', selectedNutrition.fiber],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="px-2 py-2.5 text-center">
                      <dt className="text-[10px] text-ink-subtle">{label}</dt>
                      <dd className="mt-0.5 text-xs font-medium text-ink tnum">{formatGrams(value)} g</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {editItem ? (
              <p className="text-[11px] leading-relaxed text-ink-subtle">
                This entry stays in {MEAL_LABELS[mealType]}. Changing the food itself is not supported here.
              </p>
            ) : (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-ink">Add to</legend>
                <div className="grid grid-cols-4 gap-2">
                  {MEAL_TYPES.map((type) => {
                    const active = type === mealType;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMealType(type)}
                        className={[
                          'h-10 rounded-md border text-[13px] font-medium transition-colors duration-150',
                          active
                            ? 'border-brand-500 bg-brand-50 text-brand-800'
                            : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
                        ].join(' ')}
                      >
                        {MEAL_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>
        ) : null}
      </BottomSheet>

      <FoodEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onAddNowRequest={(created) => {
          setSelected(created);
          setQuantity(String(created.portion?.grams ?? 100));
          setStep('quantity');
        }}
      />
    </>
  );
}
