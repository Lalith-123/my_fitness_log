import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronLeft, Menu, Plus, X } from 'lucide-react';
import { MOBILE_NAV, PRIMARY_NAV } from '@/app/navigation';
import { useIsDesktop } from '@/hooks';
import { useProfile, useTargetCalories } from '@/hooks/useAppData';
import { formatCalories } from '@/utils/numbers/numbers';

const MOBILE_TAB_BAR_HEIGHT = 60;

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isDesktop = useIsDesktop();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const profile = useProfile();
  const target = useTargetCalories();

  if (isDesktop) {
    return (
      <div className="min-h-dvh bg-canvas">
        <div className="mx-auto flex w-full max-w-[1180px] gap-8 px-6">
          <DesktopSidebar />
          <main id="main-content" className="min-w-0 flex-1 py-10">
            <div className="mx-auto w-full max-w-[780px]">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <MobileHeader
        profileName={profile?.name}
        targetCalories={target?.target ?? null}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((open) => !open)}
        onNavigate={(to) => {
          setMenuOpen(false);
          navigate(to);
        }}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[560px] px-4 pt-1 pb-4"
        style={{ paddingBottom: MOBILE_TAB_BAR_HEIGHT + 32 }}
      >
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}

interface MobileHeaderProps {
  profileName: string | undefined;
  targetCalories: number | null;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onNavigate: (to: string) => void;
}

function MobileHeader({
  profileName,
  targetCalories,
  menuOpen,
  onToggleMenu,
  onNavigate,
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/92 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[560px] items-center gap-2 px-4 py-2.5 safe-top">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="-ml-1.5 flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          {menuOpen ? (
            <X size={19} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Menu size={19} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">
            {profileName ? `${profileName}'s log` : 'Fitness Log'}
          </p>
          <p className="truncate text-[11px] text-ink-subtle tnum">
            {targetCalories ? `Target ${formatCalories(targetCalories)} kcal` : 'No calorie target yet'}
          </p>
        </div>
      </div>
      {menuOpen ? (
        <div id="mobile-menu" className="border-t border-line bg-surface animate-rise-in">
          <nav aria-label="All sections" className="mx-auto w-full max-w-[560px] px-2 py-2">
            {PRIMARY_NAV.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => onNavigate(item.to)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                <item.icon size={17} strokeWidth={2} aria-hidden="true" />
                {item.label}
              </button>
            ))}
            <p className="px-3 pt-3 pb-2 text-[11px] leading-relaxed text-ink-subtle">
              Your data stays on this device. No account, no server.
            </p>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function MobileTabBar() {
  const navigate = useNavigate();
  const left = MOBILE_NAV.slice(0, 2);
  const right = MOBILE_NAV.slice(2);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/96 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto grid w-full max-w-[560px] grid-cols-5 items-center">
        {left.map((item) => (
          <TabLink key={item.to} item={item} />
        ))}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/food?add=1')}
            aria-label="Add food to today"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-ink-inverse shadow-sm transition-colors hover:bg-brand-800 active:bg-brand-900"
          >
            <Plus size={22} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        {right.map((item) => (
          <TabLink key={item.to} item={item} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ item }: { item: (typeof MOBILE_NAV)[number] }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        [
          'flex h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
          isActive ? 'text-brand-700' : 'text-ink-subtle hover:text-ink-muted',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={21} strokeWidth={isActive ? 2.2 : 1.9} aria-hidden="true" />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function DesktopSidebar() {
  const profile = useProfile();
  const target = useTargetCalories();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col border-r border-line py-8 pr-2 lg:flex">
      <div className="px-3">
        <p className="text-sm font-semibold tracking-[-0.01em] text-ink">Fitness Log</p>
        <p className="mt-0.5 truncate text-xs text-ink-subtle">
          {profile ? `${profile.name}'s log` : 'Local tracking'}
        </p>
      </div>

      <nav aria-label="Primary" className="mt-7 flex flex-col gap-0.5">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
                isActive
                  ? 'bg-brand-50 font-medium text-brand-800'
                  : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
              ].join(' ')
            }
          >
            <item.icon size={18} strokeWidth={2} aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-3">
        <div className="border-t border-line pt-4">
          <p className="text-xs leading-relaxed text-ink-subtle">
            Your data stays on this device. No account, no server.
          </p>
          {target ? (
            <p className="mt-2 text-xs text-ink-muted tnum">Target {formatCalories(target.target)} kcal</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function PageHeader({
  title,
  description,
  action,
  onBack,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="-ml-2 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="text-[19px] font-semibold tracking-[-0.015em] text-ink sm:text-[21px]">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
