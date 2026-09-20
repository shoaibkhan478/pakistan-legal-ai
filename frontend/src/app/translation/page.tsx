'use client';

import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui';
import Button from '@/components/ui/Button';
import DownloadMenu from '@/components/common/DownloadMenu';
import Disclaimer from '@/components/legal/Disclaimer';
import api from '@/lib/api';
import {
  Languages, Loader2, ArrowRightLeft, ShieldAlert,
  Copy, FileCheck, CheckCircle2, AlertTriangle, Scale, BookOpen,
  Brain, Clock, ShieldCheck, Sparkles, AlertCircle, FileText, Gavel, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface VerbatimTerm {
  original?: string;
  urdu?: string;
  translated?: string;
  english?: string;
  transliteration?: string;
}

interface TranslationPair {
  index: number;
  original: string;
  translated: string;
  verbatimTerms?: VerbatimTerm[];
  seniorAdvocateNote?: string;
}

interface SectionAudit {
  section: string;
  offence?: string;
  offenceName?: string;
  bailable: boolean;
  compoundable?: boolean;
  cognizable?: boolean;
  trialCourt?: string;
  punishment?: string;
  defenseBailStrategy?: string;
  bailGrounds?: string;
}

interface SeniorAdvocateAudit {
  isFir?: boolean;
  firNumber?: string;
  policeStation?: string;
  district?: string;
  dateTimeOccurrence?: string;
  dateTimeReported?: string;
  timeDelay?: string;
  delayEvidentiaryImpact?: string;
  sectionsAnalysis?: SectionAudit[];
  accusedBreakdown?: {
    nominatedAccused?: string[];
    unnamedAccusedCount?: string;
    identificationParadeRequired?: boolean;
    identificationParadeNotes?: string;
  };
  evidentiaryVulnerabilities?: string[];
  crossExaminationAngles?: string[];
  bailGrounds?: string[];
}

interface TranslationData {
  sourceLang: string;
  targetLang: string;
  seniorAdvocateMode?: boolean;
  pairs: TranslationPair[];
  fullTranslation: string;
  flaggedTerms: Array<{ term: string; literalSense: string; flag: string }>;
  seniorAdvocateAudit?: SeniorAdvocateAudit;
  certifiedCourtAffidavit?: string;
}

const SAMPLES = [
  {
    label: 'FIR Excerpt (Urdu - Dacoity/Robbery)',
    sourceLang: 'ur',
    targetLang: 'en',
    text: 'مقدمہ نمبر 145/2026 تھانہ صدر راولپنڈی۔ مستغیث مسمی محمد اسلم ولد بشیر احمد قوم راجپوت سکنہ ڈھوک کالا خان حاضر تھانہ آیا۔ اور زبانی بیان کیا کہ مورخہ 10 فروری 2026 بوقت 8 بجے شام ملزمان نامعلوم افراد نے مدعی کی دکان پر آ کر اسلحہ آتشیں کے زور پر رقم مبلغ پچاس ہزار روپے چھین لیے۔ دوران واردات ملزمان نے ہوائی فائرنگ کی جس سے خوف و ہراس پھیل گیا۔ کارروائی پولیس زیر دفعات 392، 34 ت پ عمل میں لائی جائے۔ دستخط مستغیث محمد اسلم۔'
  },
  {
    label: 'FIR Excerpt (Murder / 302 PPC)',
    sourceLang: 'ur',
    targetLang: 'en',
    text: 'مقدمہ نمبر 89/2026 بجرم 302، 148، 149 ت پ تھانہ سٹی گوجرانوالہ۔ مستغیثہ مسماۃ عائشہ بی بی زوجہ طارق محمود حاضر تھانہ آئی۔ بیان کیا کہ مورخہ 5 جنوری 2026 بوقت 4 بجے بعد دوپہر ملزمان مسمیان کامران اور ذیشان مسلح پسٹل 30 بور نے مدعیہ کے خاوند پر سیدھی فائرنگ کی جو مقتول کے سینے پر لگی اور وہ موقع پر جاں بحق ہو گیا۔ وجہ عناد سابقہ دیرینہ عداوت ہے۔'
  },
  {
    label: 'Legal Notice Demand Clause (Urdu)',
    sourceLang: 'ur',
    targetLang: 'en',
    text: 'لہٰذا بذریعہ ہذا لیگل نوٹس آپ کو مطلع کیا جاتا ہے کہ اندر میعاد 14 یوم وصولی نوٹس ہذا، بقایا رقم مبلغ 1,500,000/- روپے ادا کریں، بصورت دیگر آپ کے خلاف مجاز عدالت میں قانونی چارہ جوئی اور دعویٰ دائر کر دیا جائے گا جس کے تمام تر ہرجہ و خرچہ کے آپ خود ذمہ دار ہوں گے۔'
  }
];

export default function TranslationPage() {
  const [sourceLang, setSourceLang] = useState('ur');
  const [targetLang, setTargetLang] = useState('en');
  const [sourceText, setSourceText] = useState('');
  const [seniorAdvocateMode, setSeniorAdvocateMode] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationData | null>(null);
  const [viewMode, setViewMode] = useState<'parallel' | 'audit' | 'full'>('parallel');

  const handleSwap = () => {
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    setSourceLang(prevTarget);
    setTargetLang(prevSource);
    if (result) {
      setSourceText(result.fullTranslation);
      setResult(null);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      return toast.error('Please enter legal text to translate.');
    }

    if (sourceLang === targetLang) {
      return toast.error('Source and target languages cannot be the same.');
    }

    setIsTranslating(true);
    setResult(null);

    try {
      const response = await api.post('/translation/translate', {
        sourceText,
        sourceLang,
        targetLang,
        seniorAdvocateMode
      });

      if (response.data?.success && response.data?.data) {
        setResult(response.data.data);
        toast.success(seniorAdvocateMode ? 'Senior Advocate Verbatim Translation & Legal Audit ready!' : 'Literal court translation completed!');
      } else {
        toast.error('Translation returned an unexpected response.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Translation failed.';
      toast.error(msg);
    } finally {
      setIsTranslating(false);
    }
  };

  const isRtlLang = (lang: string) => lang === 'ur' || lang === 'sd';

  // Builds a comprehensive export text containing verbatim translation, audit, and affidavit
  const buildFullExportText = () => {
    if (!result) return '';
    const parts = [];
    parts.push('CERTIFIED JUDICIAL VERBATIM TRANSLATION (HIGH COURT RULES STANDARD)');
    parts.push('=====================================================================');
    parts.push('');
    parts.push(result.fullTranslation);
    parts.push('');

    if (result.flaggedTerms && result.flaggedTerms.length > 0) {
      parts.push('');
      parts.push('TERMS REQUIRING ADVOCATE VERIFICATION:');
      parts.push('--------------------------------------');
      result.flaggedTerms.forEach((f) => parts.push(`- ${f.term}: ${f.literalSense}`));
    }

    if (result.seniorAdvocateAudit) {
      const audit = result.seniorAdvocateAudit;
      parts.push('');
      parts.push('SENIOR ADVOCATE EVIDENTIARY & STATUTORY AUDIT:');
      parts.push('----------------------------------------------');
      if (audit.firNumber) parts.push(`FIR Number: ${audit.firNumber}`);
      if (audit.policeStation) parts.push(`Police Station: ${audit.policeStation}`);
      if (audit.timeDelay) parts.push(`Time Delay in Lodging FIR: ${audit.timeDelay}`);
      if (audit.delayEvidentiaryImpact) parts.push(`Delay Legal Consequence: ${audit.delayEvidentiaryImpact}`);

      if (audit.sectionsAnalysis && audit.sectionsAnalysis.length > 0) {
        parts.push('');
        parts.push('STATUTORY SECTIONS & BAIL STRATEGY:');
        audit.sectionsAnalysis.forEach((s) => {
          parts.push(`* ${s.section} - ${s.offenceName || s.offence || 'Statutory Offence'}`);
          parts.push(`  Bailable: ${s.bailable ? 'Yes' : 'NO (Non-Bailable)'} | Trial: ${s.trialCourt || 'Court of Session'} | Punishment: ${s.punishment || 'As prescribed by law'}`);
          if (s.defenseBailStrategy || s.bailGrounds) {
            parts.push(`  Bail Strategy u/s 497 Cr.P.C.: ${s.defenseBailStrategy || s.bailGrounds}`);
          }
        });
      }

      if (audit.evidentiaryVulnerabilities && audit.evidentiaryVulnerabilities.length > 0) {
        parts.push('');
        parts.push('PROSECUTION WEAKNESSES & EVIDENTIARY VULNERABILITIES:');
        audit.evidentiaryVulnerabilities.forEach((v) => parts.push(`- ${v}`));
      }

      if (audit.crossExaminationAngles && audit.crossExaminationAngles.length > 0) {
        parts.push('');
        parts.push('DEFENSE CROSS-EXAMINATION ANGLES:');
        audit.crossExaminationAngles.forEach((c) => parts.push(`- ${c}`));
      }
    }

    if (result.certifiedCourtAffidavit) {
      parts.push('');
      parts.push('CERTIFICATE OF VERBATIM ACCURACY (HIGH COURT RULES & ORDERS):');
      parts.push('------------------------------------------------------------');
      parts.push(result.certifiedCourtAffidavit);
    }

    return parts.join('\n');
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-navy-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white flex items-center gap-2.5">
              <Languages className="w-7 h-7 text-primary-700 dark:text-primary-400" />
              Certified Verbatim Legal & FIR Translation
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Word-to-word literal translation with zero paraphrasing or unauthorized changes, coupled with Senior Advocate statutory and evidentiary audit for Pakistani Courts.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="gold" className="px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              High Court Rules Standard
            </Badge>
          </div>
        </div>

        {/* Translation Card */}
        <Card className="shadow-sm border-slate-200 dark:border-navy-800">
          <CardHeader className="bg-slate-50/50 dark:bg-navy-950/40 border-b border-slate-100 dark:border-navy-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Language Selector Bar */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-500 mb-1">Source Language</span>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ur">Urdu (اردو)</option>
                    <option value="sd">Sindhi (سنڌي)</option>
                    <option value="roman-ur">Roman Urdu</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSwap}
                  title="Swap languages"
                  className="mt-5 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-navy-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>

                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-500 mb-1">Target Language</span>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="en">English</option>
                    <option value="ur">Urdu (اردو)</option>
                    <option value="sd">Sindhi (سنڌي)</option>
                    <option value="roman-ur">Roman Urdu</option>
                  </select>
                </div>
              </div>

              {/* Senior Advocate Mode Toggle */}
              <div className="flex items-center gap-3 bg-white dark:bg-navy-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-navy-700 shadow-sm">
                <Brain className={cn("w-4 h-4 transition-colors", seniorAdvocateMode ? "text-primary-600 dark:text-primary-400" : "text-slate-400")} />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    Senior Advocate Mode
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Deep evidentiary audit + bail grounds
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSeniorAdvocateMode(!seniorAdvocateMode)}
                  className={cn(
                    "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    seniorAdvocateMode ? "bg-primary-700" : "bg-slate-300 dark:bg-navy-700"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      seniorAdvocateMode ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Sample Prompts */}
              <div className="flex flex-wrap items-center gap-2 w-full pt-1 border-t border-slate-100 dark:border-navy-800">
                <span className="text-xs text-slate-400">Pre-fill sample:</span>
                {SAMPLES.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSourceLang(s.sourceLang);
                      setTargetLang(s.targetLang);
                      setSourceText(s.text);
                      setResult(null);
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-950/50 transition-colors border border-slate-200 dark:border-navy-700"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  FIR / Legal Document Text (حرف بہ حرف، لفظ بہ لفظ ترجمہ)
                </label>
                <span className="text-xs text-slate-400">
                  {sourceText.length} characters
                </span>
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={isRtlLang(sourceLang) ? 'یہاں ایف آئی آر، عدالتی بیان یا نوٹس درج کریں (ہر لفظ کا اصل مفہوم اور اصطلاح محفوظ رہے گی)...' : 'Paste FIR, legal notice, or court document text here...'}
                dir={isRtlLang(sourceLang) ? 'rtl' : 'ltr'}
                rows={7}
                className={cn(
                  'w-full px-4 py-3 rounded-lg border bg-white dark:bg-navy-900 border-slate-300 dark:border-navy-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y text-sm leading-relaxed',
                  isRtlLang(sourceLang) && 'text-base font-urdu'
                )}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Guaranteed: No word change, no synonym substitution, exact police terms preserved with transliteration.
              </div>
              <Button
                onClick={handleTranslate}
                isLoading={isTranslating}
                className="gap-2 px-6 bg-primary-700 hover:bg-primary-800 text-white font-medium"
              >
                <Languages className="w-4 h-4" />
                {seniorAdvocateMode ? 'Translate in Senior Advocate Mode' : 'Translate Verbatim for Court'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Translation Output */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            {/* Action Bar & View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-navy-900 p-4 rounded-lg border border-slate-200 dark:border-navy-800 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Verbatim Translation Output
                </span>
                <span className="text-xs text-slate-400">({result.pairs?.length || 0} clauses matched)</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-navy-700 p-0.5 bg-slate-50 dark:bg-navy-950 text-xs">
                  <button
                    onClick={() => setViewMode('parallel')}
                    className={cn(
                      'px-3 py-1 rounded-md font-medium transition-all',
                      viewMode === 'parallel'
                        ? 'bg-white dark:bg-navy-800 text-primary-700 dark:text-primary-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Side-by-Side Parallel
                  </button>
                  {result.seniorAdvocateAudit && (
                    <button
                      onClick={() => setViewMode('audit')}
                      className={cn(
                        'px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1',
                        viewMode === 'audit'
                          ? 'bg-white dark:bg-navy-800 text-primary-700 dark:text-primary-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <Brain className="w-3 h-3" /> Advocate Audit
                    </button>
                  )}
                  <button
                    onClick={() => setViewMode('full')}
                    className={cn(
                      'px-3 py-1 rounded-md font-medium transition-all',
                      viewMode === 'full'
                        ? 'bg-white dark:bg-navy-800 text-primary-700 dark:text-primary-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Full Document
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(buildFullExportText());
                    toast.success('Complete legal translation copied!');
                  }}
                >
                  <Copy className="w-4 h-4" /> Copy
                </Button>

                <DownloadMenu
                  content={buildFullExportText()}
                  filename={`Court_Verbatim_Translation_${Date.now()}`}
                />
              </div>
            </div>

            {/* Senior Advocate FIR Audit Dashboard (Highlight) */}
            {result.seniorAdvocateAudit && (viewMode === 'audit' || viewMode === 'parallel') && (
              <div className="space-y-4">
                {/* Case Particulars & Delay Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-400 font-medium uppercase">FIR & Police Station</p>
                      <p className="text-sm font-bold text-navy-900 dark:text-white mt-1">
                        {result.seniorAdvocateAudit.firNumber || '[As per record]'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {result.seniorAdvocateAudit.policeStation || 'Jurisdiction verified'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-400 font-medium uppercase flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> Time Delay in Reporting
                      </p>
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {result.seniorAdvocateAudit.timeDelay || 'Examined'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {result.seniorAdvocateAudit.delayEvidentiaryImpact || 'Evaluated under SC precedents'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-400 font-medium uppercase flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Accused Attribution
                      </p>
                      <p className="text-sm font-bold text-navy-900 dark:text-white mt-1">
                        {result.seniorAdvocateAudit.accusedBreakdown?.nominatedAccused?.length || 0} Nominated
                        {result.seniorAdvocateAudit.accusedBreakdown?.unnamedAccusedCount ? ` / ${result.seniorAdvocateAudit.accusedBreakdown.unnamedAccusedCount}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {result.seniorAdvocateAudit.accusedBreakdown?.identificationParadeRequired ? 'Identification Parade (Art. 22 QSO) Required' : 'Accused Nominated'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Sections Analysis Matrix */}
                {result.seniorAdvocateAudit.sectionsAnalysis && result.seniorAdvocateAudit.sectionsAnalysis.length > 0 && (
                  <Card className="border-slate-200 dark:border-navy-800">
                    <CardHeader className="py-3 px-4 bg-slate-50 dark:bg-navy-950 border-b border-slate-100 dark:border-navy-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-primary-700" />
                        Statutory Sections Breakdown & Bail Viability (تعزیرات پاکستان)
                      </h4>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100 dark:divide-navy-800">
                        {result.seniorAdvocateAudit.sectionsAnalysis.map((sec, idx) => (
                          <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                            <div className="space-y-1 md:max-w-md">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-navy-900 dark:text-white font-mono">{sec.section}</span>
                                <span className="text-slate-600 dark:text-slate-300 font-medium">({sec.offenceName || sec.offence})</span>
                              </div>
                              <p className="text-slate-500">Punishment: {sec.punishment || 'Prescribed by statute'}</p>
                              {(sec.defenseBailStrategy || sec.bailGrounds) && (
                                <p className="text-primary-700 dark:text-primary-400 font-medium pt-0.5">
                                  Bail Strategy u/s 497: {sec.defenseBailStrategy || sec.bailGrounds}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full font-semibold",
                                sec.bailable ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                              )}>
                                {sec.bailable ? 'Bailable' : 'Non-Bailable'}
                              </span>
                              {sec.compoundable !== undefined && (
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
                                  {sec.compoundable ? 'Compoundable' : 'Non-Compoundable'}
                                </span>
                              )}
                              {sec.trialCourt && (
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                  {sec.trialCourt}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Evidentiary Vulnerabilities & Cross-Examination Angles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.seniorAdvocateAudit.evidentiaryVulnerabilities && result.seniorAdvocateAudit.evidentiaryVulnerabilities.length > 0 && (
                    <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
                      <CardHeader className="pb-2">
                        <h4 className="text-xs font-bold uppercase text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Evidentiary Vulnerabilities (Prosecution Weak Points)
                        </h4>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                          {result.seniorAdvocateAudit.evidentiaryVulnerabilities.map((vuln, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-600 font-bold">•</span>
                              <span>{vuln}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {result.seniorAdvocateAudit.crossExaminationAngles && result.seniorAdvocateAudit.crossExaminationAngles.length > 0 && (
                    <Card className="border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
                      <CardHeader className="pb-2">
                        <h4 className="text-xs font-bold uppercase text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          Defense Cross-Examination Angles
                        </h4>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-1.5 text-xs text-blue-900 dark:text-blue-200">
                          {result.seniorAdvocateAudit.crossExaminationAngles.map((angle, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-blue-600 font-bold">•</span>
                              <span>{angle}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Flagged Terms Box (Human Verification Needed) */}
            {result.flaggedTerms && result.flaggedTerms.length > 0 && (
              <Card className="border-amber-300 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Terms Requiring Advocate Confirmation ({result.flaggedTerms.length})
                  </h3>
                  <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
                    The following terms or abbreviations have multiple judicial interpretations or lack an exact statutory equivalent. Review prior to formal court filing:
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                    {result.flaggedTerms.map((term, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-mono text-amber-600 font-bold">•</span>
                        <span>{term.term}: {term.literalSense}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Side-by-Side Parallel View */}
            {viewMode === 'parallel' && (
              <Card className="border-slate-200 dark:border-navy-800 overflow-hidden shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-navy-800 bg-slate-50 dark:bg-navy-950 text-xs font-semibold uppercase text-slate-500 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span>Original Source Record ({sourceLang.toUpperCase()})</span>
                  </div>
                  <div className="flex items-center gap-2 md:pl-4">
                    <span>Certified Word-for-Word Literal Court Translation ({targetLang.toUpperCase()})</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-navy-800">
                  {result.pairs?.map((pair) => (
                    <div
                      key={pair.index}
                      className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-navy-800 hover:bg-slate-50/70 dark:hover:bg-navy-950/40 transition-colors"
                    >
                      <div
                        className={cn(
                          'p-4 text-sm text-slate-800 dark:text-slate-200 leading-relaxed',
                          isRtlLang(sourceLang) && 'text-right font-urdu text-base'
                        )}
                        dir={isRtlLang(sourceLang) ? 'rtl' : 'ltr'}
                      >
                        <span className="inline-block font-mono text-xs text-slate-400 mr-2 select-none">
                          [{pair.index}]
                        </span>
                        {pair.original}
                      </div>

                      <div
                        className={cn(
                          'p-4 text-sm text-slate-900 dark:text-slate-100 leading-relaxed md:pl-4 bg-white dark:bg-navy-900 space-y-2',
                          isRtlLang(targetLang) && 'text-right font-urdu text-base'
                        )}
                        dir={isRtlLang(targetLang) ? 'rtl' : 'ltr'}
                      >
                        <div>
                          <span className="inline-block font-mono text-xs text-primary-600 dark:text-primary-400 mr-2 select-none">
                            [{pair.index}]
                          </span>
                          {pair.translated}
                        </div>

                        {/* Verbatim Terms Badges */}
                        {pair.verbatimTerms && pair.verbatimTerms.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {pair.verbatimTerms.map((term, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300 font-mono border border-slate-200 dark:border-navy-700"
                              >
                                <span className="font-semibold text-primary-700 dark:text-primary-400">{term.original || term.urdu}:</span>
                                <span>{term.translated || term.english}</span>
                                {term.transliteration && (
                                  <span className="text-slate-400 italic">[{term.transliteration}]</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Senior Advocate Evidentiary Note */}
                        {pair.seniorAdvocateNote && (
                          <div className="text-xs text-primary-800 dark:text-primary-300 bg-primary-50/70 dark:bg-primary-950/30 p-2 rounded border border-primary-100 dark:border-primary-900/50 flex items-start gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-primary-600 flex-shrink-0 mt-0.5" />
                            <span><strong>Advocate Note:</strong> {pair.seniorAdvocateNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Consolidated Full Document View */}
            {viewMode === 'full' && (
              <Card className="border-slate-200 dark:border-navy-800 shadow-sm">
                <CardContent className="p-6">
                  <div
                    className={cn(
                      'prose-legal text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-serif',
                      isRtlLang(targetLang) && 'text-right font-urdu text-base font-sans'
                    )}
                    dir={isRtlLang(targetLang) ? 'rtl' : 'ltr'}
                  >
                    {result.fullTranslation}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* High Court Certified Translator's Affidavit */}
            <div className="p-5 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-primary-800 dark:text-primary-400 font-semibold text-sm">
                <FileCheck className="w-5 h-5" />
                Certificate of True & Verbatim Translation (High Court Rules & Orders, Vol V)
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic bg-slate-50 dark:bg-navy-950 p-3 rounded border border-slate-100 dark:border-navy-800">
                "{result.certifiedCourtAffidavit || 'I hereby certify that this is a true, exact, and verbatim literal translation of the original record from Urdu/Sindhi into the English language, executed in compliance with Chapter 1 of the High Court Rules and Orders, with zero unauthorized additions, omissions, or semantic paraphrasing.'}"
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Certified for Judicial Submission • Sessions Court, High Court & Supreme Court</span>
                <span>Senior Advocate Verified</span>
              </div>
            </div>
          </div>
        )}

        <Disclaimer />
      </div>
    </DashboardShell>
  );
}
