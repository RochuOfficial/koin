import type { IconName } from '@/components/icons/registry';

/**
 * Static reference catalogs — achievements, goal templates, countries,
 * currencies, expense categories. Extracted out of store.ts (Phase 3,
 * implementations/I18N_SCALE.md) so they're importable under vitest:
 * store.ts pulls in AsyncStorage and expo-notifications, neither of which
 * resolve under vitest (same rationale as missions.ts and lessons.ts), which
 * made these catalogs untestable against `content.json` while they lived
 * there. store.ts re-exports everything here for every existing call site
 * (`@/lib/store`'s `COUNTRIES`/`CURRENCIES`/`EXPENSE_CATEGORIES` imports)
 * to keep working unchanged.
 */

/**
 * `title`/`description` are not stored here (Phase 6,
 * implementations/I18N_SCALE.md) — they live entirely in `content.json`'s
 * `achievements.<id>`, read at render time via
 * `t(\`content:achievements.${id}.title\`)`. Persisted `achievements` state
 * carries the same trimmed shape as of the `v5 → v6` migration
 * (storeMigrations.ts) — `id`/`unlocked`/`unlockedAt` are the only fields
 * anything actually reads off it. `icon` was dropped from this shape by the
 * `v6 → v7` migration (#128, implementations/ICON_SYSTEM.md) the same way
 * `title`/`description` were: it's resolved by `id` from ACHIEVEMENT_ICONS
 * below at render time instead of carried per-instance.
 */
export interface Achievement {
  id: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', unlocked: false },
  { id: 'a2', unlocked: false },
  { id: 'a3', unlocked: false },
  { id: 'a4', unlocked: false },
  { id: 'a5', unlocked: false },
  { id: 'a6', unlocked: false },
  { id: 'a7', unlocked: false },
  { id: 'a8', unlocked: false },
  { id: 'a9', unlocked: false },
  { id: 'a10', unlocked: false },
  { id: 'a11', unlocked: false },
  { id: 'a12', unlocked: false },
];

/**
 * Icon lookup by achievement id (#128). `icon` is set once a custom asset
 * exists for that achievement; `emoji` is the fallback rendered until then
 * (a6 has no sourced asset yet — see ICON_SYSTEM.md's open items).
 */
export const ACHIEVEMENT_ICONS: Record<string, { icon?: IconName; emoji: string }> = {
  a1: { icon: 'target', emoji: '🎯' },
  a2: { icon: 'flame', emoji: '🔥' },
  a3: { icon: 'lightning', emoji: '⚡' },
  a4: { icon: 'trophy', emoji: '🏆' },
  a5: { icon: 'seedling', emoji: '🌱' },
  a6: { emoji: '💪' },
  a7: { icon: 'rocket', emoji: '🚀' },
  a8: { icon: 'crown', emoji: '👑' },
  a9: { icon: 'pie-chart', emoji: '📊' },
  a10: { icon: 'star-podium', emoji: '⭐' },
  a11: { icon: 'diamond', emoji: '💎' },
  a12: { icon: 'brain', emoji: '🧠' },
};

// `name` is deliberately absent (Phase 6, implementations/I18N_SCALE.md) —
// display names live entirely in content.json's `goalTemplates.<id>`, keyed
// by `id` alone. Every UI call site already reads `t(`content:goalTemplates.${id}`)`
// or the equivalent, not `.name`. Unlike Achievement, nothing currently
// renders this catalog's icon (#128 audit) — `icon`/`emoji` are kept in step
// with the rest of the migration anyway so it's ready if a call site appears.
export const GOAL_TEMPLATES: { id: string; icon?: IconName; emoji: string; suggestedAmount: number }[] = [
  { id: 'holiday', icon: 'airplane', emoji: '✈️', suggestedAmount: 2000 },
  { id: 'concert', emoji: '🎵', suggestedAmount: 300 },
  { id: 'car', icon: 'car', emoji: '🚗', suggestedAmount: 15000 },
  { id: 'emergency', icon: 'shield-check', emoji: '🛡️', suggestedAmount: 5000 },
  { id: 'laptop', icon: 'laptop', emoji: '💻', suggestedAmount: 1500 },
  { id: 'education', icon: 'book-idea', emoji: '📚', suggestedAmount: 10000 },
  { id: 'apartment', icon: 'house', emoji: '🏠', suggestedAmount: 20000 },
  { id: 'wedding', emoji: '💍', suggestedAmount: 25000 },
  { id: 'trip', emoji: '🌍', suggestedAmount: 1000 },
  { id: 'purchase', icon: 'gift', emoji: '🎁', suggestedAmount: 500 },
];

/**
 * The onboarding "what are we saving for?" quick-pick chips (#128 — was
 * duplicated verbatim between app/onboarding.tsx and app/(tabs)/goals.tsx;
 * consolidated here). `label` is the canonical (English) goal name written to
 * `goalName` and, from there, to the persisted Goal and the onboarding
 * webhook payload — it is NOT re-translated per language, matching how plan
 * names stay untranslated (see implementations/I18N_PL.md's Decisions). Only
 * the on-screen chip text is translated, via `id` into goal.chips.* in
 * content.json.
 */
export const GOAL_CHIPS: { id: string; label: string; icon: IconName; emoji: string }[] = [
  { id: 'vacation', label: 'Vacation', icon: 'airplane', emoji: '🏝️' },
  { id: 'newCar', label: 'New Car', icon: 'car', emoji: '🚗' },
  { id: 'houseDeposit', label: 'House Deposit', icon: 'house', emoji: '🏠' },
  { id: 'emergencyFund', label: 'Emergency Fund', icon: 'shield-check', emoji: '💰' },
  { id: 'somethingElse', label: 'Something Else', icon: 'pencil', emoji: '✏️' },
];

/**
 * Resolves the icon key a newly-created goal should be stamped with (#128),
 * matching against GOAL_CHIPS' untranslated canonical label the same way
 * app/(tabs)/goals.tsx's old local `GOAL_ICONS` map did. Goal.icon is
 * persisted per-instance at creation time (not looked up fresh at render,
 * unlike Achievement/EXPENSE_CATEGORIES) — see storeMigrations.ts's
 * `v6 → v7` step for why that matters. Falls back to the generic target icon
 * for any free-typed goal name that doesn't match a chip.
 */
export function getGoalIconKey(goalName: string): IconName {
  return GOAL_CHIPS.find((c) => c.label === goalName)?.icon ?? 'target';
}

// `name` dropped for the same reason — see `content.json`'s `countries.<code>`.
export const COUNTRIES = [
  { code: 'US', currency: 'USD' },
  { code: 'GB', currency: 'GBP' },
  { code: 'CA', currency: 'CAD' },
  { code: 'AU', currency: 'AUD' },
  { code: 'DE', currency: 'EUR' },
  { code: 'FR', currency: 'EUR' },
  { code: 'ES', currency: 'EUR' },
  { code: 'IT', currency: 'EUR' },
  { code: 'NL', currency: 'EUR' },
  { code: 'IE', currency: 'EUR' },
  { code: 'PT', currency: 'EUR' },
  { code: 'BR', currency: 'BRL' },
  { code: 'MX', currency: 'MXN' },
  { code: 'JP', currency: 'JPY' },
  { code: 'CN', currency: 'CNY' },
  { code: 'IN', currency: 'INR' },
  { code: 'SG', currency: 'SGD' },
  { code: 'CH', currency: 'CHF' },
  { code: 'SE', currency: 'SEK' },
  { code: 'NO', currency: 'NOK' },
  { code: 'DK', currency: 'DKK' },
  { code: 'PL', currency: 'PLN' },
  { code: 'AE', currency: 'AED' },
  { code: 'ZA', currency: 'ZAR' },
  { code: 'NZ', currency: 'NZD' },
  { code: 'HU', currency: 'HUF' },
];

// `name` dropped for the same reason — see `content.json`'s `currencies.<code>`.
// `symbol`/`symbolAfter` stay: they're formatting data, not copy.
export const CURRENCIES = [
  { code: 'USD', symbol: '$',    symbolAfter: false },
  { code: 'EUR', symbol: '€',    symbolAfter: false },
  { code: 'GBP', symbol: '£',    symbolAfter: false },
  { code: 'CAD', symbol: 'CA$',  symbolAfter: false },
  { code: 'AUD', symbol: 'A$',   symbolAfter: false },
  { code: 'BRL', symbol: 'R$',   symbolAfter: false },
  { code: 'MXN', symbol: 'MX$',  symbolAfter: false },
  { code: 'JPY', symbol: '¥',    symbolAfter: false },
  { code: 'CNY', symbol: '¥',    symbolAfter: false },
  { code: 'INR', symbol: '₹',    symbolAfter: false },
  { code: 'SGD', symbol: 'S$',   symbolAfter: false },
  { code: 'CHF', symbol: 'CHF',  symbolAfter: false },
  { code: 'SEK', symbol: 'kr',   symbolAfter: true  },
  { code: 'NOK', symbol: 'kr',   symbolAfter: true  },
  { code: 'DKK', symbol: 'kr',   symbolAfter: true  },
  { code: 'PLN', symbol: 'zł',   symbolAfter: true  },
  { code: 'AED', symbol: 'د.إ',  symbolAfter: false },
  { code: 'ZAR', symbol: 'R',    symbolAfter: false },
  { code: 'NZD', symbol: 'NZ$',  symbolAfter: false },
  { code: 'HUF', symbol: 'Ft',   symbolAfter: true  },
];

/**
 * Consolidates what used to be four near-identical
 * `CURRENCIES.find((c) => c.code === code)?.symbol ?? code` helpers
 * (Phase 5, implementations/I18N_SCALE.md — onboarding.tsx, goals.tsx,
 * ContributionStep.tsx, AddExpenseModal.tsx). Returns `symbolAfter` too,
 * which the symbol-only helpers didn't expose — that's what let 4 input
 * affixes hardcode the symbol before the amount regardless of the currency's
 * actual position (PLN's `zł` renders after the number everywhere else).
 */
export function getCurrency(currencyCode: string): { symbol: string; symbolAfter: boolean } {
  const match = CURRENCIES.find((c) => c.code === currencyCode);
  return match ? { symbol: match.symbol, symbolAfter: match.symbolAfter } : { symbol: currencyCode, symbolAfter: false };
}

export function getCurrencySymbol(currencyCode: string): string {
  return getCurrency(currencyCode).symbol;
}

// `name` dropped for the same reason — see `content.json`'s `expenseCategories.<id>`.
// Looked up fresh by `id` at every render site (profile.tsx, AddExpenseModal.tsx)
// rather than persisted per-expense, so — unlike GOAL_CHIPS/Goal.icon — changing
// this catalog's icons needed no data migration (#128).
export const EXPENSE_CATEGORIES: { id: string; icon?: IconName; emoji: string }[] = [
  { id: 'food', emoji: '🍔' },
  { id: 'transport', icon: 'transport-scene', emoji: '🚌' },
  { id: 'entertainment', icon: 'game-controller', emoji: '🎮' },
  { id: 'shopping', icon: 'shopping-cart', emoji: '🛍️' },
  { id: 'bills', icon: 'receipt', emoji: '📄' },
  { id: 'health', icon: 'pill-bottle', emoji: '💊' },
  { id: 'education', icon: 'book-idea', emoji: '📖' },
  { id: 'other', icon: 'pencil', emoji: '📌' },
];
