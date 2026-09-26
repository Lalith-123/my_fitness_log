import {
  History as HistoryIcon,
  LayoutDashboard as HomeIcon,
  LineChart as ProgressIcon,
  Settings as SettingsIcon,
  UtensilsCrossed as FoodIcon,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Desktop sidebar. The same information architecture is used on mobile. */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/progress', label: 'Progress', icon: ProgressIcon },
  { to: '/food', label: 'Food', icon: FoodIcon },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

/**
 * Mobile bottom bar. History stays reachable from the home date navigator and
 * the overflow menu, so the bar holds four destinations plus the add action.
 */
export const MOBILE_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/progress', label: 'Progress', icon: ProgressIcon },
  { to: '/food', label: 'Food', icon: FoodIcon },
  { to: '/settings', label: 'More', icon: SettingsIcon },
];
