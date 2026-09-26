import { Star } from 'lucide-react';
import type { ResolvedFood } from '@/services/foods/foods';
import { formatGrams, formatNumber } from '@/utils/numbers/numbers';

export interface FoodRowProps {
  food: ResolvedFood;
  onSelect: (food: ResolvedFood) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (food: ResolvedFood) => void;
  /** Shows the calculated nutrition for this row's quantity context. */
  showMacros?: boolean;
  trailing?: React.ReactNode;
  selectLabel?: string;
}

/** A single food in a list: name, per-100 g energy, and a quiet macro line. */
export function FoodRow({
  food,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
  showMacros = true,
  trailing,
  selectLabel,
}: FoodRowProps) {
  return (
    <li className="flex items-stretch">
      <button
        type="button"
        onClick={() => onSelect(food)}
        aria-label={selectLabel ?? `Add ${food.name}`}
        className="flex min-w-0 flex-1 items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-surface-sunken"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-ink">{food.name}</span>
            {food.isUserCreated ? (
              <span className="shrink-0 rounded-xs border border-line bg-surface-sunken px-1 py-px text-[10px] font-medium text-ink-muted">
                Custom
              </span>
            ) : null}
          </span>
          {showMacros ? (
            <span className="mt-0.5 block truncate text-[11px] text-ink-subtle tnum">
              {food.caloriesPer100g} kcal per 100 g &middot; P {formatGrams(food.proteinPer100g)} &middot; C{' '}
              {formatGrams(food.carbsPer100g)} &middot; F {formatGrams(food.fatPer100g)}
            </span>
          ) : null}
          {food.portion ? (
            <span className="mt-0.5 block truncate text-[11px] text-ink-subtle">
              Common portion {food.portion.label} ({formatNumber(food.portion.grams)} g)
            </span>
          ) : null}
        </span>
        {trailing}
      </button>
      {onToggleFavorite ? (
        <button
          type="button"
          onClick={() => onToggleFavorite(food)}
          aria-label={isFavorite ? `Remove ${food.name} from favourites` : `Add ${food.name} to favourites`}
          aria-pressed={isFavorite}
          className="flex w-11 shrink-0 items-center justify-center self-center rounded-md text-ink-subtle transition-colors hover:text-ink"
        >
          <Star size={16} strokeWidth={2} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}
