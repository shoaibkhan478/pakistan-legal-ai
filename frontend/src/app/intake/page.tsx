'use client';

import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui';
import Button from '@/components/ui/Button';
import Disclaimer from '@/components/legal/Disclaimer';
import DeepAnalysisResult, { DeepAnalysisData } from '@/components/legal/DeepAnalysisResult';
import DownloadMenu from '@/components/common/DownloadMenu';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import {
  Gavel, Loader2, AlertTriangle, Clock, FileCheck, ListChecks, Sparkles, Scale, Download, Printer, Copy, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Flattens the Senior Advocate Mode deep-analysis result into one Markdown
// blob for the "Download" control — same reasoning as the identical helper
// on the chat page: this is rendered as many small cards, not one blob.
function deepAnalysisToMarkdown(data: DeepAnalysisData): string {
  const parts: string[] = [];
  data.issue_chains?.forEach((ic, i) => {
    parts.push(`ISSUE ${i + 1}: ${ic.issue}\nArea of Law: ${ic.area_of_law}\n\nKey Points:\n${(ic.key_points || []).map((k) => `- ${k}`).join('\n')}\n\nSupporting Arguments:\n${(ic.supporting_arguments || []).map((k) => `- ${k}`).join('\n')}\n\nOpposing Arguments:\n${(ic.opposing_arguments || []).map((k) => `- ${k}`).join('\n')}\n\nRebuttal:\n${(ic.rebuttal_points || []).map((k) => `- ${k}`).join('\n')}`);
  });
  if (data.synthesis) {
    parts.push(`CASE THEORY\n${data.synthesis.case_theory || ''}`);
    parts.push(`OVERALL ASSESSMENT\n${data.synthesis.overall_assessment || ''}`);
    parts.push(`STRATEGY RECOMMENDATION\n${data.synthesis.strategy_recommendation || ''}`);
    if (data.synthesis.risk_factors?.length) parts.push(`RISK FACTORS\n${data.synthesis.risk_factors.map((r) => `- ${r}`).join('\n')}`);
  }
  if (data.legal_references_verified?.length) {
    parts.push(`LEGAL REFERENCES\n${data.legal_references_verified.map((c) => `- ${c.citation} [${c.status}]`).join('\n')}`);
  }
  return parts.join('\n\n');
}

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

interface CaseDiagnosis {
  case_nature?: string;
  competent_court?: string;
  primary_remedy?: string;
  draft_type?: string;
  draft_title?: string;
  applicable_statutes?: string[];
  controlling_legal_issues?: string[];
  case_theory?: string;
  counter_strategy?: string;
  confidence?: string;
}

interface IntakeResult {
  diagnosis?: CaseDiagnosis;
  classification: { draft_type: string | null; confidence: string; reasoning?: string; clarifying_question?: string | null };
  limitationCheck: LimitationCheck;
  deepAnalysis: DeepAnalysisData;
  draft: { draftType: string; draftTitle?: string; content: string } | null;
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
  const [isDocxDownloading, setIsDocxDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
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

  const downloadCourtDocx = async () => {
    if (!result?.draft?.content) return;
    setIsDocxDownloading(true);
    try {
      const draftTitle = result.draft.draftTitle || result.diagnosis?.draft_title || result.draft.draftType || 'Court Ready Draft';
      const res = await api.post(
        '/intake/generate-docx',
        {
          title: draftTitle,
          content: result.draft.content,
        },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = draftTitle.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40) || 'Pakistani_Court_Draft';
      link.setAttribute('download', `${safeTitle}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Court-Ready .docx downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to download .docx draft.');
    } finally {
      setIsDocxDownloading(false);
    }
  };

  const copyDraft = () => {
    if (!result?.draft?.content) return;
    navigator.clipboard.writeText(result.draft.content);
    setIsCopied(true);
    toast.success('Draft copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const printDraft = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const title = result?.draft?.draftTitle || 'Pakistani Court Draft';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: "Times New Roman", Times, serif;
              font-size: 13pt;
              line-height: 1.8;
              margin: 40px 60px 40px 90px;
              color: #111;
            }
            h1, h2, h3 { text-align: center; text-transform: uppercase; font-size: 14pt; margin: 15px 0; }
            p { margin: 12px 0; text-align: justify; text-justify: inter-word; }
            pre { white-space: pre-wrap; font-family: "Times New Roman", Times, serif; }
            @page { margin: 1.5in 1in 1in 1in; size: legal; }
          </style>
        </head>
        <body>
          <pre>${result?.draft?.content || ''}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
            <Gavel className="w-6 h-6 text-amber-600" /> Case Intake & Court-Ready Drafting
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Describe your problem once in plain English, Urdu, or Roman Urdu. The system autonomously diagnoses the nature of the case (نوعیتِ مقدمہ), identifies the competent Pakistani court and primary legal remedy, calculates limitation deadlines, and produces an authentic Ready-to-Court-Submit Draft.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              rows={6}
              placeholder="Example: Mera bhai ko FIR No. 123/2026 mein 302 PPC ke tehat giraftar kiya gaya hai, giraftari 15/07/2026 ko hui. Sessions court ne bail refuse kar di... OR: Cheque bounce ho gaya hai 25 lakh ka... OR: Police bina warrant ke bhai ko utha kar le gayi hai..."
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
                <label className="block text-xs text-slate-500 mb-1">Draft language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="english">Formal Legal English (Pakistani High Court Standard)</option>
                  <option value="urdu">اردو (عدالتی رسم الخط)</option>
                  <option value="roman_urdu">Roman Urdu</option>
                  <option value="bilingual">Bilingual (English / Urdu)</option>
                </select>
              </div>
              <Button onClick={runIntake} isLoading={isLoading} disabled={!problemText.trim()} className="ml-auto">
                <Sparkles className="w-4 h-4" /> Diagnose & Generate Court Draft
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="py-10 flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <div className="space-y-1">
                <p className="font-semibold text-navy-900 dark:text-white">Diagnosing Case & Generating Court-Ready Draft</p>
                <p className="text-xs text-slate-500 max-w-lg">
                  Spotting issues, identifying competent court jurisdiction, mapping statutory remedies under Pakistani Law (PPC, Cr.P.C., CPC, Constitution), and drafting full court petition with verified grounds and affidavit...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {result && !isLoading && (
          <div className="space-y-5">
            <LimitationBanner lc={result.limitationCheck} />

            {/* Autonomous Pakistani Legal Diagnosis Banner */}
            {result.diagnosis && (
              <Card className="border-emerald-500/40 bg-gradient-to-r from-emerald-50/60 via-slate-50/50 to-amber-50/40 dark:from-emerald-950/20 dark:via-navy-900 dark:to-amber-950/20 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="font-bold text-navy-900 dark:text-white">
                        Autonomous Case Diagnosis (نوعیتِ مقدمہ و قانونی چارہ جوئی)
                      </h3>
                    </div>
                    <Badge variant="gold">Senior Advocate Diagnosis</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-white/90 dark:bg-navy-800/90 border border-slate-200 dark:border-navy-700">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Branch of Law & Case Nature:
                      </span>
                      <span className="font-bold text-navy-900 dark:text-white">
                        {result.diagnosis.case_nature || 'General Pakistani Legal Matter'}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/90 dark:bg-navy-800/90 border border-slate-200 dark:border-navy-700">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Competent Court / Forum (مجاز عدالت):
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        {result.diagnosis.competent_court || 'Court of Competent Jurisdiction'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/90 dark:bg-navy-800/90 border border-slate-200 dark:border-navy-700 text-sm">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Primary Statutory Remedy (بنیادی قانونی چارہ جوئی):
                    </span>
                    <span className="font-bold text-primary-600 dark:text-primary-400">
                      {result.diagnosis.primary_remedy || 'Formal Court Petition'}
                    </span>
                  </div>

                  {result.diagnosis.applicable_statutes && result.diagnosis.applicable_statutes.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                        Governing Pakistani Statutes & Provisions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {result.diagnosis.applicable_statutes.map((st, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ready-to-Court-Submit Draft */}
            {result.draft && (
              <Card className="border-2 border-primary-500/40 shadow-md">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-navy-700 pb-4 bg-slate-50/70 dark:bg-navy-800/50">
                  <div>
                    <h3 className="font-bold text-base text-navy-900 dark:text-white flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-emerald-600" />
                      {result.draft.draftTitle || `Court Draft: ${result.draft.draftType}`}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Formatted per Pakistani High Court Rules & Orders (Court Heading, Parties, Facts, Grounds, Prayer, Verification & Affidavit)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyDraft}
                      className="text-xs"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={printDraft}
                      className="text-xs"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" /> Print / PDF
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={downloadCourtDocx}
                      isLoading={isDocxDownloading}
                      className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Court-Ready .docx
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Pakistani Court Paper Styling Container */}
                  <div className="p-6 md:p-10 rounded-xl bg-white dark:bg-navy-950 border border-slate-300 dark:border-navy-700 shadow-inner font-serif text-slate-900 dark:text-slate-100 leading-relaxed text-sm md:text-base border-l-8 border-l-emerald-600">
                    <div className="prose-legal prose-base max-w-none dark:prose-invert">
                      <ReactMarkdown>{result.draft.content}</ReactMarkdown>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {result.nextSteps?.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-primary-500" /> Recommended next steps
                  </h3>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.nextSteps.map((step, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                        <span className="text-primary-500 font-bold">→</span> {step}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <DownloadMenu
                content={deepAnalysisToMarkdown(result.deepAnalysis)}
                filename={`Case_Intake_Analysis_${Date.now()}`}
              />
            </div>
            <DeepAnalysisResult data={result.deepAnalysis} />
          </div>
        )}

        <Disclaimer compact />
      </div>
    </DashboardShell>
  );
}
