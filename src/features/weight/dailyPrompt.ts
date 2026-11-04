/**
 * Tracks the automatic daily weight prompt for the current app session.
 *
 * Kept in module scope on purpose: the prompt is shown once per opening of the
 * app, so dismissing it does not bring it back when navigating between pages,
 * but a reload or a new visit starts fresh and asks again until the day's weight
 * has been recorded.
 */
let promptedDate: string | null = null;

export function hasShownDailyWeightPrompt(date: string): boolean {
  return promptedDate === date;
}

export function markDailyWeightPromptShown(date: string): void {
  promptedDate = date;
}
