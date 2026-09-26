import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileUp, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { Card, Row, StatList } from '@/components/common/Card';
import { Dialog } from '@/components/common/Dialog';
import { ConfirmDialog } from '@/components/common/Dialog';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { SelectField } from '@/components/common/SelectField';
import { useToast } from '@/components/common/Toast';
import { GoalEditor } from './GoalEditor';
import { ProfileEditor } from './ProfileEditor';
import {
  BACKUP_DATA_LOSS_WARNING,
  MEDICAL_DISCLAIMER,
  OFFLINE_NOTE,
  PRIVACY_DETAILS,
  PRIVACY_STATEMENT,
} from '@/app/content';
import {
  useActiveGoal,
  useCompletedGoals,
  useProfile,
  useSettings,
  useTargetCalories,
} from '@/hooks/useAppData';
import { getAvailableMonths, type MonthOption } from '@/services/analytics/monthly';
import { exportMonthlyCsv } from '@/services/export/csv';
import { exportFullBackup, isBackupEmpty, readBackupFile } from '@/services/export/backup';
import { validateBackup } from '@/services/import/validate';
import { clearAllData, restoreBackup, type ImportMode } from '@/services/import/restore';
import { setTheme } from '@/services/settings/settings';
import { formatDayMonth, getMonthKey, getTodayLocalDate, MONTH_LABELS } from '@/utils/dates/dates';
import { formatNumber } from '@/utils/numbers/numbers';
import type { ThemePreference } from '@/types';

type ImportStep = 'idle' | 'chooseMode' | 'restoring' | 'done';

export function SettingsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const profile = useProfile();
  const goal = useActiveGoal();
  const completedGoals = useCompletedGoals();
  const settings = useSettings();
  const targets = useTargetCalories();

  const today = getTodayLocalDate();
  const [monthKey, setMonthKey] = useState(() => getMonthKey(today));
  const [months, setMonths] = useState<MonthOption[]>([]);

  const [profileOpen, setProfileOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<Parameters<typeof restoreBackup>[0] | null>(null);
  const [importStep, setImportStep] = useState<ImportStep>('idle');
  const [importSummary, setImportSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAvailableMonths(today).then((options) => {
      if (!cancelled) setMonths(options);
    });
    return () => {
      cancelled = true;
    };
  }, [today]);

  const monthOptions = useMemo(
    () =>
      months.map((month) => ({
        value: month.monthKey,
        label:
          month.daysLogged > 0
            ? `${formatMonthLabel(month.monthKey)} (${month.daysLogged}d)`
            : formatMonthLabel(month.monthKey),
      })),
    [months],
  );

  const handleExportCsv = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const result = await exportMonthlyCsv(profile.name, monthKey);
      showToast(`Exported ${result.rowCount} rows.`, 'success');
    } catch {
      showToast('Could not create the CSV file.', 'caution');
    } finally {
      setBusy(false);
    }
  };

  const handleExportBackup = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const filename = await exportFullBackup(profile.name);
      showToast(`Saved ${filename}.`, 'success');
    } catch {
      showToast('Could not create the backup file.', 'caution');
    } finally {
      setBusy(false);
    }
  };

  const handlePickFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const { backup, error } = await readBackupFile(file);
      if (error || backup === undefined) {
        showToast(error ?? 'That file could not be read.', 'caution');
        return;
      }
      const result = validateBackup(backup);
      if (!result.ok) {
        showToast(result.message, 'caution');
        return;
      }
      if (isBackupEmpty(result.backup)) {
        showToast('That backup does not contain any of your records.', 'caution');
        return;
      }
      for (const warning of result.warnings) showToast(warning, 'caution');
      setPendingBackup(result.backup);
      setImportStep('chooseMode');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestore = async (mode: ImportMode) => {
    if (!pendingBackup) return;
    setImportStep('restoring');
    setBusy(true);
    try {
      const result = await restoreBackup(pendingBackup, mode);
      setImportSummary(
        `${result.summary.meals} meals, ${result.summary.mealItems} food entries and ${result.summary.weightLogs} weight entries restored.`,
      );
      setImportStep('done');
      setPendingBackup(null);
      showToast('Backup restored.', 'success');
    } catch (error) {
      setImportStep('idle');
      setPendingBackup(null);
      showToast(
        error instanceof Error ? error.message : 'The backup could not be restored. Nothing changed.',
        'caution',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAll = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      await clearAllData();
      showToast('All of your data has been deleted.', 'success');
      navigate('/');
    } catch {
      showToast('Could not delete your data. Please try again.', 'caution');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="Settings" description="Your profile, goal, data and privacy." />

      <div className="flex flex-col gap-5 pb-8">
        <Card>
          <h2 className="text-[14px] font-semibold text-ink">Profile</h2>
          {profile ? (
            <>
              <StatList className="mt-2">
                <Row label="Name" value={profile.name} />
                <Row label="Age" value={`${profile.age}`} />
                <Row label="Sex" value={profile.sex === 'male' ? 'Male' : profile.sex === 'female' ? 'Female' : 'Prefer not to say'} />
                <Row label="Height" value={`${formatNumber(profile.heightCm, 0)} cm`} />
                <Row label="Current weight" value={`${formatNumber(profile.currentWeightKg, 1)} kg`} />
                <Row label="Activity" value={ACTIVITY_LABEL[profile.activityLevel]} />
              </StatList>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setProfileOpen(true)}>
                Edit profile
              </Button>
            </>
          ) : (
            <p className="mt-1 text-[12px] text-ink-subtle">No profile saved.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-[14px] font-semibold text-ink">Goal</h2>
          {goal ? (
            <>
              <StatList className="mt-2">
                <Row label="Type" value={GOAL_LABEL[goal.type]} />
                <Row label="Start" value={`${formatNumber(goal.startingWeightKg, 1)} kg`} />
                <Row label="Target" value={`${formatNumber(goal.targetWeightKg, 1)} kg`} />
                {goal.weeklyChangeKg ? (
                  <Row label="Weekly rate" value={`${formatNumber(Math.abs(goal.weeklyChangeKg), 2)} kg`} />
                ) : null}
              </StatList>
              {targets ? (
                <p className="mt-2 text-[11px] text-ink-subtle tnum">
                  BMR {formatNumber(targets.bmr, 0)} kcal · maintenance {formatNumber(targets.tdee, 0)} kcal ·
                  target {formatNumber(targets.target, 0)} kcal
                </p>
              ) : null}
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setGoalOpen(true)}>
                Edit goal
              </Button>
            </>
          ) : (
            <p className="mt-1 text-[12px] text-ink-subtle">No goal set yet.</p>
          )}

          {completedGoals.length > 0 ? (
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[11px] font-medium text-ink-muted">Completed goals</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {completedGoals.slice(0, 5).map((entry) => (
                  <li key={entry.id} className="text-[12px] text-ink-subtle tnum">
                    {GOAL_LABEL[entry.type]} · {formatNumber(entry.startingWeightKg, 1)} kg to{' '}
                    {formatNumber(entry.targetWeightKg, 1)} kg
                    {entry.completedAt ? ` · reached ${formatDayMonth(entry.completedAt)}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-[14px] font-semibold text-ink">Appearance</h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            Follows your device setting by default.
          </p>
          <SegmentedControl
            className="mt-3"
            label="Theme"
            fullWidth
            size="sm"
            value={settings?.theme ?? 'system'}
            onChange={(value) => {
              void setTheme(value as ThemePreference);
            }}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <p className="mt-3 text-[11px] text-ink-subtle">Measurements are in metric (g, kg, cm).</p>
        </Card>

        <Card>
          <h2 className="text-[14px] font-semibold text-ink">Export</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            A CSV is a readable spreadsheet of one month. A backup is a complete copy of your data
            that you can restore later.
          </p>

          <div className="mt-3 flex flex-col gap-3">
            <div>
              <SelectField
                label="Month"
                selectSize="sm"
                value={monthKey}
                onChange={(value) => setMonthKey(value)}
                options={
                  monthOptions.length > 0
                    ? monthOptions
                    : [{ value: monthKey, label: formatMonthLabel(monthKey) }]
                }
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                fullWidth
                disabled={busy}
                leadingIcon={<Download size={15} strokeWidth={2} aria-hidden="true" />}
                onClick={handleExportCsv}
              >
                Download CSV
              </Button>
            </div>

            <div>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                disabled={busy}
                leadingIcon={<Download size={15} strokeWidth={2} aria-hidden="true" />}
                onClick={handleExportBackup}
              >
                Download full backup
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-[14px] font-semibold text-ink">Restore from backup</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Choose a backup file. You decide whether it replaces everything or merges into what you
            already have.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => void handlePickFile(event.target.files?.[0])}
          />
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            fullWidth
            disabled={busy}
            leadingIcon={<FileUp size={15} strokeWidth={2} aria-hidden="true" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose backup file
          </Button>
        </Card>

        <Card>
          <h2 className="text-[14px] font-semibold text-ink">Privacy</h2>
          <p className="mt-1 text-[12px] font-medium text-ink">{PRIVACY_STATEMENT}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {PRIVACY_DETAILS.map((detail) => (
              <li key={detail} className="flex gap-2 text-[12px] leading-relaxed text-ink-muted">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-subtle" aria-hidden="true" />
                {detail}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-subtle">
            {OFFLINE_NOTE}
          </p>
        </Card>

        <Card>
          <h2 className="text-[14px] font-semibold text-critical-700">Delete all data</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Removes your profile, goals, meals, weight history, settings and any foods you created.
            The built-in food list stays, so the app still works. This cannot be undone.
          </p>
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            disabled={busy}
            leadingIcon={<Trash2 size={15} strokeWidth={2} aria-hidden="true" />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete everything
          </Button>
        </Card>

        <p className="text-[11px] leading-relaxed text-ink-subtle">{MEDICAL_DISCLAIMER}</p>
      </div>

      <ProfileEditor
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={() => showToast('Profile updated.', 'success')}
      />

      <GoalEditor
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        onSaved={() => showToast('Goal updated.', 'success')}
      />

      <Dialog
        open={importStep === 'chooseMode'}
        onClose={() => {
          setImportStep('idle');
          setPendingBackup(null);
        }}
        title="How should this backup be applied?"
        description="Both options run in a single transaction, so a failure leaves your data untouched."
        width="sm"
        footer={
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => void handleRestore('replace')}
            >
              Replace everything
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => void handleRestore('merge')}
            >
              Merge into my data
            </Button>
            <Button variant="ghost" size="md" fullWidth onClick={() => setImportStep('idle')}>
              Cancel
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
          <p className="text-[12px] leading-relaxed text-ink-muted">
            <span className="font-medium text-ink">Replace</span> deletes your current data first,
            so the result matches the file exactly.
          </p>
          <p className="text-[12px] leading-relaxed text-ink-muted">
            <span className="font-medium text-ink">Merge</span> keeps what you have and writes the
            file's records on top, matching by their internal id.
          </p>
          <p className="rounded-md bg-caution-50 px-3 py-2 text-[11px] leading-relaxed text-caution-900">
            {BACKUP_DATA_LOSS_WARNING}
          </p>
        </div>
      </Dialog>

      <Dialog
        open={importStep === 'done'}
        onClose={() => setImportStep('idle')}
        title="Backup restored"
        description={importSummary ?? undefined}
        width="sm"
        footer={
          <Button variant="primary" size="lg" fullWidth onClick={() => setImportStep('idle')}>
            Done
          </Button>
        }
      >
        <div className="px-4 py-4 sm:px-5">
          <p className="text-[12px] leading-relaxed text-ink-muted">{importSummary}</p>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete all of your data?"
        message="Your profile, goals, meals, weight history, settings and custom foods are removed. The built-in food list stays. This cannot be undone."
        confirmLabel="Delete everything"
        destructive
        busy={busy}
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function formatMonthLabel(monthKey: string): string {
  const index = Number(monthKey.slice(5, 7)) - 1;
  return `${MONTH_LABELS[index] ?? monthKey} ${monthKey.slice(0, 4)}`;
}

const GOAL_LABEL = {
  lose: 'Fat loss',
  gain: 'Lean gain',
  maintain: 'Maintenance',
} as const;

const ACTIVITY_LABEL = {
  sedentary: 'Mostly sitting',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
} as const;
