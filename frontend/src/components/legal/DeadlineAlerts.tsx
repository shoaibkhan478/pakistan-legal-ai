'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui';
import api from '@/lib/api';
import { AlertTriangle, Clock, Gavel } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeadlineItem {
  caseId: string;
  title: string;
  caseNumber?: string;
  type: 'hearing' | 'limitation_deadline';
  date: string;
  daysRemaining: number | null;
  urgency: 'expired' | 'critical' | 'high' | 'moderate' | 'low' | 'unknown';
  note?: string;
}

const URGENCY_DOT: Record<string, string> = {
  expired: 'bg-red-600',
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  moderate: 'bg-blue-500',
  low: 'bg-green-500',
  unknown: 'bg-slate-400',
};

/**
 * Proactive "what needs attention across all my cases" widget — the
 * dashboard equivalent of a senior advocate glancing at their diary every
 * morning, instead of a lawyer having to open each case file individually
 * to check if anything is due. Backed by GET /api/v1/cases/deadlines
 * (deadlineTrackerService.js), which reads hearing_date and any stored
 * limitation deadlines (written by the intake orchestrator) off the cases
 * table.
 */
export default function DeadlineAlerts() {
  const [items, setItems] = useState<DeadlineItem[] | null>(null);

  useEffect(() => {
    api.get('/cases/deadlines').then(({ data }) => setItems(data.data)).catch(() => setItems([]));
  }, []);

  if (items === null) return null; // loading — skip rendering rather than show a skeleton for a low-priority widget
  if (items.length === 0) return null; // nothing due — don't clutter the dashboard with an empty state

  const urgent = items.filter((i) => ['expired', 'critical', 'high'].includes(i.urgency));
  const visible = urgent.length > 0 ? urgent.slice(0, 5) : items.slice(0, 5);

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader>
        <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" /> Upcoming deadlines
        </h3>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {visible.map((item, i) => (
            <li key={`${item.caseId}-${item.type}-${i}`}>
              <Link
                href={`/cases/${item.caseId}`}
                className="flex items-start gap-2.5 group"
              >
                <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', URGENCY_DOT[item.urgency])} />
                <div className="min-w-0">
                  <p className="text-sm text-navy-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate">
                    {item.type === 'limitation_deadline' ? <Clock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> : <Gavel className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                    {item.title} {item.caseNumber ? `(${item.caseNumber})` : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.type === 'limitation_deadline' ? 'Filing deadline' : 'Hearing'}: {item.date}
                    {typeof item.daysRemaining === 'number' && (
                      <> — {item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)}d overdue` : `${item.daysRemaining}d left`}</>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {items.length > visible.length && (
          <p className="text-xs text-slate-400 mt-3">+{items.length - visible.length} more upcoming — see Cases.</p>
        )}
      </CardContent>
    </Card>
  );
}
