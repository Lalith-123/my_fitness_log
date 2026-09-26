import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { EmptyState } from '@/components/common/EmptyState';
import { FoodRow } from './FoodRow';
import { FoodEditorSheet } from './FoodEditorSheet';
import { FoodPickerSheet } from './FoodPickerSheet';
import { FOOD_REFERENCE_NOTE } from './foodNotes';
import { useFoodCategories, useFoodIndex, useFoodSearch } from '@/hooks/useFoods';
import { toggleFavorite, type ResolvedFood } from '@/services/foods/foods';
import { suggestMealTypeForTime } from '@/services/meals/meals';
import { getTodayLocalDate } from '@/utils/dates/dates';
import { useToast } from '@/components/common/Toast';

type LibraryTab = 'all' | 'favorites' | 'custom';

export function FoodPage() {
  const { showToast } = useToast();
  const index = useFoodIndex();
  const categories = useFoodCategories(index.foods);
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<LibraryTab>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ResolvedFood | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // The mobile tab bar's centre action lands on /food?add=1 — open the picker.
  const wantsPicker = searchParams.get('add') === '1';
  useEffect(() => {
    if (wantsPicker) setPickerOpen(true);
  }, [wantsPicker]);

  const closePicker = () => {
    setPickerOpen(false);
    if (wantsPicker) {
      const next = new URLSearchParams(searchParams);
      next.delete('add');
      setSearchParams(next, { replace: true });
    }
  };

  const results = useFoodSearch(
    index,
    useMemo(
      () => ({ tab: 'all' as const, query, category }),
      [query, category],
    ),
  );

  const visible = useMemo(() => {
    if (tab === 'favorites') return index.favoriteFoods;
    if (tab === 'custom') return results.filter((food) => food.isUserCreated);
    return results;
  }, [tab, results, index.favoriteFoods]);

  const handleToggleFavorite = async (food: ResolvedFood) => {
    const isFavorite = index.favoriteIds.includes(food.id);
    try {
      await toggleFavorite(food.id, isFavorite);
    } catch {
      showToast('Unable to update favourite.', 'caution');
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Food"
        description={`${index.foods.length} foods available. Values are per 100 g.`}
        action={
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={15} strokeWidth={2.2} aria-hidden="true" />}
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            New
          </Button>
        }
      />

      <div className="flex flex-col gap-3 pb-4">
        <div className="relative">
          <Search
            size={16}
            strokeWidth={2}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value) setCategory(null);
            }}
            placeholder="Search foods"
            aria-label="Search foods"
            className="h-11 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-[15px] text-ink placeholder:text-ink-subtle"
          />
        </div>

        <SegmentedControl
          label="Food list"
          fullWidth
          size="sm"
          value={tab}
          onChange={(value) => {
            setTab(value);
            setCategory(null);
            setQuery('');
          }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'favorites', label: 'Favourites' },
            { value: 'custom', label: 'My foods' },
          ]}
        />

        {tab === 'all' && !query.trim() ? (
          <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
            <div className="flex w-max gap-1.5">
              <CategoryChip
                label="All categories"
                active={category === null}
                onClick={() => setCategory(null)}
              />
              {categories.map((entry) => (
                <CategoryChip
                  key={entry.category}
                  label={entry.category}
                  count={entry.count}
                  active={category === entry.category}
                  onClick={() => setCategory(entry.category === category ? null : entry.category)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={tab === 'favorites' ? 'No favourites yet' : tab === 'custom' ? 'No foods of your own' : 'No foods found'}
          description={
            tab === 'favorites'
              ? 'Mark foods you eat often and they will stay here for one-tap logging.'
              : tab === 'custom'
                ? 'Create a food to track something that is not in the built-in list.'
                : 'Try a shorter search term, or clear the category filter.'
          }
          actionLabel={tab === 'custom' ? 'Create food' : undefined}
          onAction={tab === 'custom' ? () => { setEditing(null); setEditorOpen(true); } : undefined}
          icon={<SlidersHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />}
        />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {visible.map((food) => (
            <FoodRow
              key={food.id}
              food={food}
              onSelect={(target) => {
                setEditing(target);
                setEditorOpen(true);
              }}
              selectLabel={`Edit ${food.name}`}
              isFavorite={index.favoriteIds.includes(food.id)}
              onToggleFavorite={handleToggleFavorite}
              trailing={
                <span className="shrink-0 self-center text-[11px] text-ink-subtle">Edit</span>
              }
            />
          ))}
        </ul>
      )}

      <p className="mt-5 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-subtle">
        {FOOD_REFERENCE_NOTE}
      </p>

      <FoodEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        food={editing}
        onSaved={() => {
          setEditorOpen(false);
        }}
      />

      <FoodPickerSheet
        open={pickerOpen}
        onClose={closePicker}
        date={getTodayLocalDate()}
        defaultMealType={suggestMealTypeForTime(new Date().getHours())}
      />
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors duration-150',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-800'
          : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
      ].join(' ')}
    >
      {label}
      {count !== undefined ? <span className="text-[10px] text-ink-subtle tnum">{count}</span> : null}
    </button>
  );
}
