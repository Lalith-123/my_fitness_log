import { useCallback, useEffect, useRef, useState } from 'react';

/** Media query hook with a stable initial value for server-safe rendering. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', handler);
    return () => list.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Prevent background scroll while a sheet or dialog is open. */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [locked]);
}

export interface SwipeHandlers {
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
  isSwiping: boolean;
}

const SWIPE_THRESHOLD_PX = 56;
const SWIPE_MAX_OFF_AXIS_RATIO = 0.7;

/**
 * Horizontal swipe detection that ignores mostly-vertical gestures, so normal
 * scrolling is never interrupted.
 */
export function useHorizontalSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  enabled = true,
): SwipeHandlers {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled) return;
      const touch = event.touches[0];
      if (!touch) return;
      start.current = { x: touch.clientX, y: touch.clientY };
      setIsSwiping(false);
    },
    [enabled],
  );

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled || !start.current) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - start.current.x;
      const deltaY = touch.clientY - start.current.y;
      start.current = null;

      const horizontalDominates = Math.abs(deltaX) > Math.abs(deltaY) / SWIPE_MAX_OFF_AXIS_RATIO;
      if (!horizontalDominates) {
        setIsSwiping(false);
        return;
      }
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
        setIsSwiping(false);
        return;
      }

      setIsSwiping(true);
      if (deltaX < 0) onSwipeLeft();
      else onSwipeRight();
      setIsSwiping(false);
    },
    [enabled, onSwipeLeft, onSwipeRight],
  );

  return { onTouchStart, onTouchEnd, isSwiping };
}

/** Debounced value, used for search-as-you-type without a data fetch. */
export function useDebouncedValue<T>(value: T, delayMs = 120): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Stable id generator for label/description pairs. */
export function useId(prefix: string): string {
  const ref = useRef<string>('');
  if (!ref.current) {
    ref.current = `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return ref.current;
}
