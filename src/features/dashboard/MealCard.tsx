import { useState } from 'react';
import { Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/common/IconButton';
import { ConfirmDialog } from '@/components/common/Dialog';
import { useToast } from '@/components/common/Toast';
import { FoodPickerSheet } from '@/features/food/FoodPickerSheet';
import {
  MEAL_LABELS,
  deleteMealItem,
  roundItemQuantity,
  sumItemsNutrition,
  updateMealItemQuantity,
} from '@/services/meals/meals';
import { formatCalories, round } from '@/utils/numbers/numbers';
import type { MealItem, MealType, NutritionTotals } from '@/types';

export interface MealCardProps {
  date: string;
  mealType: MealType;
  items: MealItem[];
  /** Suggested share of the daily target, shown only while the meal is empty. */
  targetCalories?: number;
}

export function MealCard({ date, mealType, items, targetCalories }: MealCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MealItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MealItem | null>(null);

  const totals: NutritionTotals = sumItemsNutrition(items);
  const isEmpty = items.length === 0;

  const openPicker = (item: MealItem | null) => {
    setEditingItem(item);
    setPickerOpen(true);
  };

  return (
    <section aria-label={MEAL_LABELS[mealType]}>
      <div className="flex items-baseline justify-between gap-3 py-2">
        <h3 className="text-[13px] font-semibold text-ink">{MEAL_LABELS[mealType]}</h3>
        <span className="text-[12px] text-ink-subtle tnum">
          {isEmpty ? `~${targetCalories ?? 0} kcal` : `${formatCalories(totals.calories)} kcal`}
        </span>
      </div>

      {isEmpty ? (
        <button
          type="button"
          onClick={() => openPicker(null)}
          className="flex w-full items-center justify-between gap-3 border-y border-line py-3 text-left"
        >
          <span className="text-[13px] text-ink-subtle">Nothing logged</span>
          <span className="flex items-center gap-1 text-[12px] font-medium text-brand-700">
            <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
            Add
          </span>
        </button>
      ) : (
        <ul className="border-y border-line">
          {items.map((item) => (
            <MealItemRow
              key={item.id}
              item={item}
              onEdit={() => openPicker(item)}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
          <li>
            <button
              type="button"
              onClick={() => openPicker(null)}
              className="flex w-full items-center gap-1.5 py-2.5 text-[12px] font-medium text-brand-700"
            >
              <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
              Add food
            </button>
          </li>
        </ul>
      )}

      <FoodPickerSheet
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setEditingItem(null);
        }}
        date={date}
        defaultMealType={mealType}
        editItem={editingItem}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove this entry?"
        message="The item is removed from this meal. Your other entries are not affected."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (!target) return;
          try {
            await deleteMealItem(target.id);
          } catch {
            /* the list re-renders from the database either way */
          }
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}

function MealItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: MealItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const changeQuantity = async (grams: number) => {
    const next = roundItemQuantity(grams);
    if (next < 1 || next === item.quantityGrams) return;
    setBusy(true);
    try {
      await updateMealItemQuantity(item.id, next);
    } catch {
      showToast('Unable to change the amount.', 'caution');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onEdit} className="block w-full text-left">
          <span className="block truncate text-[13px] font-medium text-ink">{item.foodNameSnapshot}</span>
          <span className="block text-[11px] text-ink-subtle tnum">
            {round(item.quantityGrams, 0)} g · {formatCalories(item.caloriesSnapshot)} kcal
          </span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          label={`Reduce ${item.foodNameSnapshot} by 10 grams`}
          size="sm"
          disabled={busy}
          onClick={() => changeQuantity(item.quantityGrams - 10)}
        >
          <Minus size={15} strokeWidth={2.2} aria-hidden="true" />
        </IconButton>
        <span className="w-11 text-center text-[12px] text-ink-muted tnum">
          {round(item.quantityGrams, 0)}g
        </span>
        <IconButton
          label={`Increase ${item.foodNameSnapshot} by 10 grams`}
          size="sm"
          disabled={busy}
          onClick={() => changeQuantity(item.quantityGrams + 10)}
        >
          <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
        </IconButton>
        <IconButton label={`Edit ${item.foodNameSnapshot}`} size="sm" onClick={onEdit}>
          <Pencil size={14} strokeWidth={2} aria-hidden="true" />
        </IconButton>
        <IconButton label={`Remove ${item.foodNameSnapshot}`} size="sm" onClick={onDelete}>
          <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
        </IconButton>
      </div>
    </li>
  );
}
