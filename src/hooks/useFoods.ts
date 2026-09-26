import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db/database';
import { getResolvedFoods, searchFoods, type ResolvedFood } from '@/services/foods/foods';
import { useDebouncedValue } from '@/hooks';

export interface FoodIndex {
  foods: ResolvedFood[];
  recentFoods: ResolvedFood[];
  favoriteFoods: ResolvedFood[];
  recentIds: string[];
  favoriteIds: string[];
  byId: Map<string, ResolvedFood>;
  ready: boolean;
}

export function useFoodIndex(): FoodIndex {
  const state = useLiveQuery(async () => {
    const [foods, recentRows, favoriteRows] = await Promise.all([
      getResolvedFoods(),
      db.recentFoods.orderBy('usedAt').reverse().toArray(),
      db.favorites.orderBy('createdAt').reverse().toArray(),
    ]);

    const byId = new Map(foods.map((food) => [food.id, food]));
    const recentFoods = recentRows
      .map((row) => byId.get(row.foodId))
      .filter((food): food is ResolvedFood => Boolean(food));
    const favoriteFoods = favoriteRows
      .map((row) => byId.get(row.foodId))
      .filter((food): food is ResolvedFood => Boolean(food));

    return { foods, recentFoods, favoriteFoods };
  }, []);

  const foods = state?.foods ?? [];
  const byId = useMemo(() => new Map(foods.map((food) => [food.id, food])), [foods]);

  return {
    foods,
    recentFoods: state?.recentFoods ?? [],
    favoriteFoods: state?.favoriteFoods ?? [],
    recentIds: (state?.recentFoods ?? []).map((food) => food.id),
    favoriteIds: (state?.favoriteFoods ?? []).map((food) => food.id),
    byId,
    ready: state !== undefined,
  };
}

export type FoodBrowseTab = 'recent' | 'favorites' | 'all' | 'categories';

export interface FoodBrowseState {
  tab: FoodBrowseTab;
  query: string;
  category: string | null;
}

export function useFoodSearch(index: FoodIndex, state: FoodBrowseState): ResolvedFood[] {
  const debouncedQuery = useDebouncedValue(state.query, 100);

  return useMemo(() => {
    const term = debouncedQuery.trim();

    if (term) {
      return searchFoods(index.foods, term, {
        ...(state.category ? { category: state.category } : {}),
      });
    }

    if (state.tab === 'recent') return index.recentFoods.slice(0, 20);
    if (state.tab === 'favorites') return index.favoriteFoods.slice(0, 30);
    if (state.category) return searchFoods(index.foods, '', { category: state.category, limit: 60 });
    if (state.tab === 'all') return searchFoods(index.foods, '', { limit: 40 });
    return [];
  }, [index, debouncedQuery, state.tab, state.category]);
}

export function useFoodCategories(foods: ResolvedFood[]): { category: string; count: number }[] {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const food of foods) {
      counts.set(food.category, (counts.get(food.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  }, [foods]);
}

export function useFavoriteState(foodId: string): boolean {
  return useLiveQuery(async () => Boolean(await db.favorites.get(foodId)), [foodId], false);
}

export function useUserCreatedFoods(): ResolvedFood[] {
  return useLiveQuery(
    async () => {
      const rows = await db.foods.filter((food) => food.isUserCreated).toArray();
      return rows
        .map((food) => ({ ...food, isOverridden: false }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [],
    [],
  );
}
