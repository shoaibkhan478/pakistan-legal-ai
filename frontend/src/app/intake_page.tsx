'use client';

import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui';
import Button from '@/components/ui/Button';
import Disclaimer from '@/components/legal/Disclaimer';
import DeepAnalysisResult, { DeepAnalysisData } from '@/components/legal/DeepAnalysisResult';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import {
  Gavel, Loader2, AlertTriangle, Clock, FileCheck, ListChecks, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LimitationCheck {
  detected: boolean;
  caseType?: string;
  article?: string;
  deadline?: string | null;
  daysRemaining?: number | null;
  urgency?: 'immediate' | 'critical' | 'high' | 'moderate' | 'low' | 'expired';
  needsTriggerDate?: boolean;
  message?: string;
  disclaimer?: string;
}

interface IntakeResult {
  classification: { draft_type: string | null; confidence: string; reasoning?: string; clarifying_question?: string | null };
  limitationCheck: LimitationCheck;
  deepAnalysis: DeepAnalysisData;
  draft: { draftType: string; content: string } | null;
  nextSteps: string[];
}

const URGENCY_STYLES: Record<string, string> = {
  expired: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  immediate: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  high: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  moderate: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  low: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
};

function LimitationBanner({ lc }: { lc: LimitationCheck }) {
  if (!lc?.detected) return null;

  if (lc.needsTriggerDate) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold">Limitation-sensitive matter detected — trigger date needed</p>
          <p className="mt-1">{lc.message}</p>
        </div>
      </div>
    );
  }

  const style = URGENCY_STYLES[lc.urgency || 'low'];
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-lg border', style)}>
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold">
          {lc.caseType} — deadline: {lc.deadline || 'immediate'}
          {typeof lc.daysRemaining === 'number' && (
            <> ({lc.daysRemaining < 0 ? `${Math.abs(lc.daysRemaining)} days OVERDUE` : `${lc.daysRemaining} days remaining`})</>
          )}
        </p>
        <p className="mt-1 opacity-90">{lc.article}</p>
        <p className="mt-2 text-xs opacity-75">{lc.disclaimer}</p>
      </div>
    </div>
  );
}

export default function IntakePage() {
  const [problemText, setProblemText] = useState('');
  const [triggerDate, setTriggerDate] = useState('');
  const [language, setLanguage] = useState('english');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);

  const runIntake = async () => {
    if (!problemText.trim() || isLoading) return;
    setIsLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/intake', {
        problemText,
        language,
        triggerDate: triggerDate || undefined,
      });
      setResult(data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Case intake failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
            <Gavel className="w-6 h-6 text-amber-600" /> Case Intake
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Describe your problem once, in your own words. The AI decides for itself — like a senior advocate would — whether
            there's a filing deadline to flag, what research needs doing, and whether a draft is warranted.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              rows={6}
              placeholder="Example: Mera bhai ko FIR No. 123/2026 mein 302 PPC ke tehat giraftar kiya gaya hai, giraftari 15/07/2026 ko hui. Sessions court ne bail refuse kar di..."
              className="w-full resize-none px-4 py-3 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-slate-500 mb-1">
                  Trigger date (optional — order/breach/dispossession date, for an exact deadline)
                </label>
                <input
                  type="date"
                  value={triggerDate}
                  onChange={(e) => setTriggerDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Draft language (if a draft is produced)</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="english">English</option>
                  <option value="urdu">اردو</option>
                  <option value="roman_urdu">Roman Urdu</option>
                  <option value="bilingual">Bilingual</option>
                </select>
              </div>
              <Button onClick={runIntake} isLoading={isLoading} disabled={!problemText.trim()} className="ml-auto">
                <Sparkles className="w-4 h-4" /> Analyze this case
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="py-10 flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">
                Checking deadlines, spotting issues, arguing both sides, verifying citations, and deciding whether a
                draft is warranted — this can take 1-2 minutes.
              </p>
            </CardContent>
          </Card>
        )}

        {result && !isLoading && (
          <div className="space-y-5">
            <LimitationBanner lc={result.limitationCheck} />

            {result.nextSteps?.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                    <ListChecks className="w-4 h-4" /> Recommended next steps
                  </h3>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.nextSteps.map((step, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                        <span className="text-primary-500">→</span> {step}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <DeepAnalysisResult data={result.deepAnalysis} />

            {result.draft && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-green-600" /> Drafted: {result.draft.draftType}
                  </h3>
                  <Badge variant="gold">auto-generated — review before filing</Badge>
                </CardHeader>
                <CardContent>
                  <div className="prose-legal prose-sm max-w-none">
                    <ReactMarkdown>{result.draft.content}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Disclaimer compact />
      </div>
    </DashboardShell>
  );
}
