'use client';

import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge, Textarea } from '@/components/ui';
import Button from '@/components/ui/Button';
import DownloadMenu from '@/components/common/DownloadMenu';
import Disclaimer from '@/components/legal/Disclaimer';
import api from '@/lib/api';
import {
  Languages, Loader2, ArrowRightLeft, ShieldAlert,
  Copy, FileCheck, CheckCircle2, AlertTriangle, Scale, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface TranslationPair {
  index: number;
  original: string;
  translated: string;
}

interface TranslationData {
  sourceLang: string;
  targetLang: string;
  pairs: TranslationPair[];
  fullTranslation: string;
  flaggedTerms: string[];
  certifiedDisclaimer: string;
}

const SAMPLES = [
  {
    label: 'FIR Excerpt (Urdu)',
    sourceLang: 'ur',
    targetLang: 'en',
    text: 'مقدمہ نمبر 145/2026 تھانہ صدر راولپنڈی۔ مستغیث مسماۃ فاطمہ بی بی دختر محمد اسلم حاضر تھانہ ہوئی۔ اور بیان کیا کہ مورخہ 12 فروری 2026 بوقت 8 بجے شام ملزمان نامعلوم افراد نے مدعیہ کے گھر میں زبردستی داخل ہو کر زیورات مالیتی پانچ لاکھ روپے چھین لیے۔ دوران واردات ملزمان نے مدعیہ کو جان سے مارنے کی دھمکیاں دیں۔ مقدمہ زیر دفعات 392، 506 ت پ درج رجسٹر کیا جائے۔'
  },
  {
    label: 'Legal Notice Clause (Urdu)',
    sourceLang: 'ur',
    targetLang: 'en',
    text: 'لہٰذا بذریعہ ہذا لیگل نوٹس آپ کو مطلع کیا جاتا ہے کہ اندر میعاد 14 یوم وصولی نوٹس ہذا، بقایا رقم مبلغ 1,500,000/- روپے ادا کریں، بصورت دیگر آپ کے خلاف مجاز عدالت میں قانونی چارہ جوئی اور دعویٰ دائر کر دیا جائے گا جس کے تمام تر ہرجہ و خرچہ کے آپ خود ذمہ دار ہوں گے۔'
  },
  {
    label: 'Court Order Excerpt (English)',
    sourceLang: 'en',
    targetLang: 'ur',
    text: 'Application for post-arrest bail under section 497 Cr.P.C. is hereby accepted subject to furnishing bail bonds in the sum of Rs. 100,000/- with two local sureties each in the like amount to the satisfaction of the learned trial court.'
  }
];

export default function TranslationPage() {
  const [sourceLang, setSourceLang] = useState('ur');
  const [targetLang, setTargetLang] = useState('en');
  const [sourceText, setSourceText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationData | null>(null);
  const [viewMode, setViewMode] = useState<'parallel' | 'full'>('parallel');

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
        targetLang
      });

      if (response.data?.success && response.data?.data) {
        setResult(response.data.data);
        toast.success('Literal court translation completed!');
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

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-navy-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white flex items-center gap-2.5">
              <Languages className="w-7 h-7 text-primary-700 dark:text-primary-400" />
              Certified Literal Legal Translation
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Word-exact, sentence-by-sentence legal translation for Pakistani court submissions with zero additions, omissions, or paraphrasing.
            </p>
          </div>
          <Badge variant="gold" className="self-start sm:self-auto px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            Court Submission Standard
          </Badge>
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

              {/* Sample Prompts */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Try sample:</span>
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
                  Legal Source Document / Text
                </label>
                <span className="text-xs text-slate-400">
                  {sourceText.length} characters
                </span>
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={isRtlLang(sourceLang) ? 'یہاں ایف آئی آر، عدالتی فیصلہ یا نوٹس درج کریں...' : 'Paste FIR, legal notice, decree, or court document text here...'}
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
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Preserves original section numbers, names, dates, and paragraph layout verbatim.
              </div>
              <Button
                onClick={handleTranslate}
                isLoading={isTranslating}
                className="gap-2 px-6"
              >
                <Languages className="w-4 h-4" />
                Translate for Court Submission
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
                  Translation Output
                </span>
                <span className="text-xs text-slate-400">({result.pairs?.length || 0} clauses mapped)</span>
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
                  <button
                    onClick={() => setViewMode('full')}
                    className={cn(
                      'px-3 py-1 rounded-md font-medium transition-all',
                      viewMode === 'full'
                        ? 'bg-white dark:bg-navy-800 text-primary-700 dark:text-primary-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Full Translation
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(result.fullTranslation);
                    toast.success('Translation copied to clipboard!');
                  }}
                >
                  <Copy className="w-4 h-4" /> Copy
                </Button>

                <DownloadMenu
                  content={result.fullTranslation}
                  filename={`Certified_Translation_${Date.now()}`}
                />
              </div>
            </div>

            {/* Flagged Terms Box (Human Verification Needed) */}
            {result.flaggedTerms && result.flaggedTerms.length > 0 && (
              <Card className="border-amber-300 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Terms Requiring Advocate Verification ({result.flaggedTerms.length})
                  </h3>
                  <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
                    The following terms or abbreviations have multiple judicial interpretations or lack an exact statutory equivalent. Please review prior to filing:
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                    {result.flaggedTerms.map((term, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-mono text-amber-600 font-bold">•</span>
                        <span>{term}</span>
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
                    <span>Source Text ({sourceLang.toUpperCase()})</span>
                  </div>
                  <div className="flex items-center gap-2 md:pl-4">
                    <span>Certified Literal Translation ({targetLang.toUpperCase()})</span>
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
                          'p-4 text-sm text-slate-900 dark:text-slate-100 leading-relaxed md:pl-4 bg-white dark:bg-navy-900',
                          isRtlLang(targetLang) && 'text-right font-urdu text-base'
                        )}
                        dir={isRtlLang(targetLang) ? 'rtl' : 'ltr'}
                      >
                        <span className="inline-block font-mono text-xs text-primary-600 dark:text-primary-400 mr-2 select-none">
                          [{pair.index}]
                        </span>
                        {pair.translated}
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
                      'prose-legal text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap',
                      isRtlLang(targetLang) && 'text-right font-urdu text-base'
                    )}
                    dir={isRtlLang(targetLang) ? 'rtl' : 'ltr'}
                  >
                    {result.fullTranslation}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certified Declaration Footer */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-navy-950/60 border border-slate-200 dark:border-navy-800 flex items-start gap-3 text-xs text-slate-500">
              <FileCheck className="w-5 h-5 text-primary-700 dark:text-primary-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Certified Legal Fidelity Guarantee
                </p>
                <p className="mt-0.5">
                  {result.certifiedDisclaimer || 'This translation has been executed under strict literal-fidelity protocols for judicial submission in Pakistani courts. Wording, syntax, and proper nouns remain faithful to the original record.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <Disclaimer />
      </div>
    </DashboardShell>
  );
}
