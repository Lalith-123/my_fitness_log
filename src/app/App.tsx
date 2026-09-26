import { useCallback, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider, useToast } from '@/components/common/Toast';
import { AppShell } from '@/components/layout/AppShell';
import { useAppBootstrap, useIsOnboarded } from '@/hooks/useAppData';
import { useTheme } from '@/hooks/useTheme';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { FoodPage } from '@/features/food/FoodPage';
import { ProgressPage } from '@/features/progress/ProgressPage';
import { HistoryPage } from '@/features/history/HistoryPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { Button } from '@/components/common/Button';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const location = useLocation();
  const onboarded = useIsOnboarded();
  const { showToast } = useToast();
  useTheme();

  const handleGoalCompleted = useCallback(
    (message: string) => {
      showToast(message, 'success');
    },
    [showToast],
  );

  // Seeds the food database once, then re-checks goal completion whenever the
  // latest weight changes.
  const { status } = useAppBootstrap(handleGoalCompleted);

  // Move focus to the page heading on navigation for screen reader users.
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) main.scrollTo?.({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (status === 'error') return <StorageErrorScreen />;
  if (onboarded === undefined || status === 'loading') return <BootScreen />;

  if (!onboarded) {
    return (
      <Routes>
        <Route path="*" element={<OnboardingPage />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/food" element={<FoodPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function BootScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <p className="text-sm text-ink-subtle">Opening your log...</p>
    </div>
  );
}

function StorageErrorScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
      <h1 className="text-[17px] font-semibold text-ink">Local storage is unavailable</h1>
      <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
        This app keeps everything on your device, which needs browser storage to be enabled. Private
        browsing windows and blocked site data can prevent that.
      </p>
      <Button variant="secondary" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  );
}
