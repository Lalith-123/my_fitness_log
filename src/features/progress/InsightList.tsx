import { Card } from '@/components/common/Card';
import type { Insight } from '@/services/analytics/monthly';

export function InsightList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <Card>
      <h2 className="text-[14px] font-semibold text-ink">What your records show</h2>
      <ul className="mt-2.5 flex flex-col gap-2">
        {insights.map((insight) => (
          <li key={insight.id} className="flex gap-2 text-[12px] leading-relaxed text-ink-muted">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-subtle" aria-hidden="true" />
            {insight.text}
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed text-ink-subtle">
        These lines describe what you recorded. They are not a judgement of your intake and not
        medical advice.
      </p>
    </Card>
  );
}
