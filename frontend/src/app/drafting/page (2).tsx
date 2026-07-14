'use client';

import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader } from '@/components/ui';
import Button from '@/components/ui/Button';
import { Textarea, Input } from '@/components/ui';
import Disclaimer from '@/components/legal/Disclaimer';
import api from '@/lib/api';
import { PenTool, Loader2, Download, FileSignature, Languages, Sparkles, ListChecks, MessageCircleQuestion, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const draftTypeLabel = (value: string) => {
  const map: Record<string, string> = {
    bail_application: 'Bail Application', civil_suit: 'Civil Suit', legal_notice: 'Legal Notice',
    reply_notice: 'Reply Notice', written_statement: 'Written Statement', petition: 'Petition / Writ',
    affidavit: 'Affidavit', contract: 'Contract / Agreement', appeal: 'Appeal',
  };
  return map[value] || value;
};

const draftTypes = [
  { value: 'bail_application', label: 'Bail Application', icon: '⚖️' },
  { value: 'civil_suit', label: 'Civil Suit', icon: '📋' },
  { value: 'legal_notice', label: 'Legal Notice', icon: '📨' },
  { value: 'reply_notice', label: 'Reply Notice', icon: '↩️' },
  { value: 'written_statement', label: 'Written Statement', icon: '📝' },
  { value: 'petition', label: 'Petition / Writ', icon: '🏛️' },
  { value: 'affidavit', label: 'Affidavit', icon: '✍️' },
  { value: 'contract', label: 'Contract / Agreement', icon: '🤝' },
  { value: 'appeal', label: 'Appeal', icon: '📤' },
];

const languages = [
  { value: 'english', label: 'English' },
  { value: 'urdu', label: 'اردو' },
  { value: 'roman_urdu', label: 'Roman Urdu' },
];

export default function DraftingPage() {
  const [mode, setMode] = useState<'smart' | 'manual'>('smart');

  // ---- Manual mode state (existing behaviour, unchanged) ----
  const [draftType, setDraftType] = useState('bail_application');
  const [language, setLanguage] = useState('english');
  const [details, setDetails] = useState('');
  const [partyA, setPartyA] = useState('');
  const [partyB, setPartyB] = useState('');
  const [court, setCourt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  // ---- Smart mode state ----
  const [problemText, setProblemText] = useState('');
  const [smartLanguage, setSmartLanguage] = useState('english');
  const [classification, setClassification] = useState<any>(null);
  const [needsClarification, setNeedsClarification] = useState(false);

  const handleGenerate = async () => {
    if (!details.trim()) return toast.error('Please provide case details.');
    setIsGenerating(true);
    setDraft(null);
    try {
      const { data } = await api.post('/drafts/generate', {
        draftType,
        language,
        title: `${draftTypes.find(d => d.value === draftType)?.label} Draft`,
        details: { partyA, partyB, court, caseDetails: details },
      });
      setDraft(data.data.content);
      toast.success('Draft generated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Smart mode: user just describes their situation in their own words.
  // No draftType is sent — the backend's classifyDraftType() figures out
  // what document fits, reasons through the case, then drafts it — the
  // same way a real advocate listens first and decides what's needed.
  const handleSmartGenerate = async () => {
    if (!problemText.trim() || problemText.trim().length < 15) {
      return toast.error('Please describe your situation in a bit more detail.');
    }
    setIsGenerating(true);
    setDraft(null);
    setClassification(null);
    setNeedsClarification(false);
    try {
      const { data } = await api.post('/drafts/generate', {
        language: smartLanguage,
        problemText,
      });

      if (data.data.needsClarification) {
        setClassification(data.data.classification);
        setNeedsClarification(true);
        toast('A bit more detail will help — see the question below.', { icon: '🤔' });
        return;
      }

      setClassification(data.data.classification);
      setDraft(data.data.content);
      toast.success(`Detected: ${draftTypeLabel(data.data.draft_type || data.data.classification?.draft_type)} — draft generated!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary-100 dark:bg-primary-950 rounded-lg flex items-center justify-center">
            <PenTool className="w-6 h-6 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Drafting Assistant</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Generate professional legal drafts for Pakistani courts</p>
          </div>
        </div>

        {/* Mode toggle: Smart (AI decides) vs Manual (I'll choose) */}
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-navy-800 p-1 bg-white dark:bg-navy-900">
          <button
            onClick={() => setMode('smart')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors',
              mode === 'smart' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400'
            )}
          >
            <Sparkles className="w-4 h-4" /> Let AI Decide (like an advocate)
          </button>
          <button
            onClick={() => setMode('manual')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors',
              mode === 'manual' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400'
            )}
          >
            <ListChecks className="w-4 h-4" /> I'll Choose Myself
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {mode === 'smart' ? (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-navy-900 dark:text-white">Tell us what's going on</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Explain your situation like you would to a lawyer — in English, Urdu, or Roman Urdu. The AI will work out
                  which document you need, analyze the case, and draft it for you.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" /> Language
                  </label>
                  <div className="flex gap-2">
                    {languages.map((l) => (
                      <button
                        key={l.value}
                        onClick={() => setSmartLanguage(l.value)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm border transition-colors',
                          smartLanguage === l.value
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400'
                            : 'border-slate-200 dark:border-navy-800 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  label="Describe your problem in your own words"
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  placeholder="e.g. Mujhay landlord ne bina notice ghar khali karnay ko kaha ha, meri agreement 2027 tak ha... ya: Police ne mera bhai FIR 302 mein giraftar kar liya, hum bail chahtay hain..."
                  rows={10}
                />

                {needsClarification && classification && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 space-y-2">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <MessageCircleQuestion className="w-4 h-4" /> One more detail would help
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">{classification.clarifying_question}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500">Add this to your description above and generate again.</p>
                  </div>
                )}

                <Button onClick={handleSmartGenerate} isLoading={isGenerating} className="w-full">
                  <Sparkles className="w-4 h-4" /> Analyze &amp; Draft
                </Button>
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader><h2 className="font-semibold text-navy-900 dark:text-white">Draft Details</h2></CardHeader>
            <CardContent className="space-y-4">
              {/* Draft type grid */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Draft Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {draftTypes.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setDraftType(t.value)}
                      className={cn(
                        'p-3 rounded-lg border text-center text-xs font-medium transition-colors',
                        draftType === t.value
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400'
                          : 'border-slate-200 dark:border-navy-800 text-slate-600 dark:text-slate-400 hover:border-primary-300'
                      )}
                    >
                      <div className="text-lg mb-1">{t.icon}</div>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5" /> Language
                </label>
                <div className="flex gap-2">
                  {languages.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setLanguage(l.value)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm border transition-colors',
                        language === l.value
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400'
                          : 'border-slate-200 dark:border-navy-800 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Party A (Applicant/Plaintiff)" value={partyA} onChange={(e) => setPartyA(e.target.value)} placeholder="Name" />
                <Input label="Party B (Respondent/Defendant)" value={partyB} onChange={(e) => setPartyB(e.target.value)} placeholder="Name" />
              </div>
              <Input label="Court Name" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="e.g. Civil Court Lahore" />

              <Textarea
                label="Case Details / Facts"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe the facts, grounds, and relief sought..."
                rows={8}
              />

              <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full">
                <FileSignature className="w-4 h-4" /> Generate Draft
              </Button>
            </CardContent>
          </Card>
          )}

          <div>
            {isGenerating && (
              <Card><CardContent className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary-700 mb-3" />
                <p className="text-sm text-slate-500">Drafting your document...</p>
              </CardContent></Card>
            )}

            {draft && !isGenerating && classification?.reasoning && (
              <Card className="mb-4">
                <CardContent className="py-4">
                  <p className="text-sm font-medium text-primary-700 dark:text-primary-400 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4" /> AI determined: {draftTypeLabel(classification.draft_type)}
                    <span className="text-xs font-normal text-slate-400">({classification.confidence} confidence)</span>
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{classification.reasoning}</p>
                </CardContent>
              </Card>
            )}

            {draft && !isGenerating && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <h3 className="font-semibold text-navy-900 dark:text-white">Generated Draft</h3>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(draft); toast.success('Copied!'); }}>
                    <Download className="w-4 h-4" /> Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    'prose-legal prose-sm max-w-none text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-navy-950 rounded-lg p-5',
                    (mode === 'smart' ? smartLanguage : language) === 'urdu' && 'urdu-text'
                  )}>
                    <ReactMarkdown>{draft}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {!draft && !isGenerating && (
              <Card><CardContent className="flex flex-col items-center justify-center py-24 text-center">
                <PenTool className="w-10 h-10 text-slate-300 dark:text-navy-700 mb-3" />
                <p className="text-sm text-slate-400">Your generated draft will appear here</p>
              </CardContent></Card>
            )}
          </div>
        </div>

        <Disclaimer />
      </div>
    </DashboardShell>
  );
}
