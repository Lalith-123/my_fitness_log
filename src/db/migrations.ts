/**
 * Schema migration notes
 * ---------------------
 * v1  Initial schema (current `DB_VERSION`).
 *
 * Rules for future versions:
 *  - Never drop or rename a user-facing table; add a new version block instead.
 *  - Never rewrite `foods` rows that the user has customised. Custom values live
 *    in `foodOverrides`; re-seeding only inserts missing default ids.
 *  - Never touch `mealItems`. Rows are immutable snapshots of nutrition at log time.
 *  - Add an `upgrade()` that transforms existing rows, then bump `DB_VERSION`.
 */
export const MIGRATION_HISTORY = [
  { version: 1, description: 'Initial schema: profile, goals, foods, overrides, meals, items, weight, settings.' },
] as const;

/** Bump when the default food list changes so newly added foods are inserted. */
export const FOOD_DATABASE_VERSION = 1;
