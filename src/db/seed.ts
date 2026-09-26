import { db, METADATA_KEYS, setMetadata, getMetadata } from './database';
import { FOOD_DATABASE_VERSION } from './migrations';
import { DEFAULT_FOODS } from '@/data/foods';
import { nowIso } from '@/utils/id';

/**
 * Insert any default food rows that are not already present.
 *
 * This is additive only. It never updates or deletes an existing `foods` row, so
 * user-created foods and any future edits to seed rows survive. A user's own
 * changes to a seed food live in `foodOverrides`, which this function does not
 * touch.
 */

// React StrictMode invokes mount effects twice, so two calls can overlap. They
// would both see an empty table and both try to insert the same ids, and the
// second would fail on a duplicate-key constraint. Sharing one in-flight promise
// makes repeat calls no-ops instead of a race.
let inFlight: Promise<void> | null = null;

export function seedFoodDatabaseIfNeeded(): Promise<void> {
  inFlight ??= runSeed().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSeed(): Promise<void> {
  await db.transaction('rw', db.foods, db.metadata, async () => {
    const currentVersion = await getMetadata(METADATA_KEYS.foodDatabaseVersion);
    if (currentVersion === String(FOOD_DATABASE_VERSION)) return;

    const rows = await db.foods.bulkGet(DEFAULT_FOODS.map((food) => food.id));
    const existingIds = new Set(
      rows.map((row) => row?.id).filter((id): id is string => Boolean(id)),
    );
    const missing = DEFAULT_FOODS.filter((food) => !existingIds.has(food.id));

    if (missing.length > 0) {
      // bulkPut, not bulkAdd: a concurrent or retried seed re-inserting the same
      // deterministic ids must update the row rather than throw.
      await db.foods.bulkPut(missing);
    }

    await setMetadata(METADATA_KEYS.foodDatabaseVersion, String(FOOD_DATABASE_VERSION));
    await setMetadata(METADATA_KEYS.seededAt, nowIso());
  });
}
