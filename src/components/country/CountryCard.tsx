import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import type { Country } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/common/ProgressRing';
import { ProgressBar } from '@/components/common/ProgressBar';
import {
  figuresCompletion,
  reportCompletion,
  reviewsCompletion,
  overallCompletion,
  isCountryComplete,
  countOverdue,
  hasReviewerFeedback,
} from '@/lib/derive';
import { Badge } from '@/components/ui/badge';
import { COMPLETION_BUCKETS } from '@/lib/types';
import { countryCompletionBucket } from '@/lib/derive';
import { REGION_COLORS } from '@/lib/constants';

interface CountryCardProps {
  country: Country;
}

export function CountryCard({ country }: CountryCardProps) {
  const fig = figuresCompletion(country);
  const rep = reportCompletion(country);
  const rev = reviewsCompletion(country);
  const overall = overallCompletion(country);
  const bucket = countryCompletionBucket(country);
  const complete = isCountryComplete(country);
  const overdue = countOverdue(country);

  return (
    <Link
      to={`/countries/${country.id}`}
      className="group block transition-transform hover:-translate-y-0.5"
    >
      <Card className="relative overflow-hidden p-0">
        <div
          className="h-1.5 w-full"
          style={{
            background: `linear-gradient(90deg, ${REGION_COLORS[country.region]}, ${COMPLETION_BUCKETS[bucket].color})`,
          }}
        />
        <div className="flex items-start gap-4 p-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span className="font-mono tabular-nums">#{country.no}</span>
              <span>·</span>
              <span>{country.region}</span>
              {country.iso3 && (
                <>
                  <span>·</span>
                  <span className="font-mono">{country.iso3}</span>
                </>
              )}
            </div>
            <div className="mt-1 font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {country.name}
            </div>
            <div className="mt-3 grid gap-1.5">
              <Row label="Figures" value={fig} />
              <Row label="Report" value={rep} />
              <Row label="Reviews" value={rev} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {complete && <Badge variant="success">Complete</Badge>}
              {hasReviewerFeedback(country) && (
                <Badge variant="warning">Feedback</Badge>
              )}
              {overdue > 0 && <Badge variant="danger">{overdue} overdue</Badge>}
              {country.comments && (
                <Badge variant="outline" className="gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Note
                </Badge>
              )}
            </div>
          </div>
          <ProgressRing value={overall} size={72} stroke={7} showText />
        </div>
      </Card>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[60px_1fr_36px] items-center gap-2 text-[11px]">
      <span className="font-medium text-slate-500">{label}</span>
      <ProgressBar value={value} />
      <span className="text-right font-mono tabular-nums text-slate-500">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
