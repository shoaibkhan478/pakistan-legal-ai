'use client';

import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader } from '@/components/ui';
import Button from '@/components/ui/Button';
import { Textarea, Input } from '@/components/ui';
import Disclaimer from '@/components/legal/Disclaimer';
import DeepAnalysisResult, { DeepAnalysisData } from '@/components/legal/DeepAnalysisResult';
import api from '@/lib/api';
import { PenTool, Loader2, Download, FileSignature, Languages, Brain, Sparkles, ListChecks, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

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

const draftTypeLabels: Record<string, string> = Object.fromEntries(draftTypes.map((t) => [t.value, t.label]));

interface Classification {
  draft_type: string | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  clarifying_question: string | null;
}

export default function DraftingPage() {
  const [mode, setMode] = useState<'manual' | 'smart'>('smart');

  const [draftType, setDraftType] = useState('bail_application');
  const [language, setLanguage] = useState('english');
  const [details, setDetails] = useState('');
  const [partyA, setPartyA] = useState('');
  const [partyB, setPartyB] = useState('');
  const [court, setCourt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [deepMode, setDeepMode] = useState(false);
  const [wasDeepDrafted, setWasDeepDrafted] = useState(false);
  const [generateStepMessage, setGenerateStepMessage] = useState('');

  // Smart mode ("describe your problem, I'll figure out the draft")
  const [problemText, setProblemText] = useState('');
  const [isSmartGenerating, setIsSmartGenerating] = useState(false);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [smartDeepResult, setSmartDeepResult] = useState<DeepAnalysisData | null>(null);
  const [smartDraft, setSmartDraft] = useState<string | null>(null);
  const [smartStepMessage, setSmartStepMessage] = useState('');

  const handleGenerate = async () => {
    if (!details.trim()) return toast.error('Please provide case details.');
    setIsGenerating(true);
    setDraft(null);
    setWasDeepDrafted(false);

    // Deep mode chains 5-8 AI calls (issue-spotting -> research -> dual-sided
    // arguments -> rebuttal -> strategy synthesis) before drafting off that
    // reasoning, so it takes noticeably longer than a normal draft — rotate
    // status text instead of a plain frozen spinner.
    let stepInterval: ReturnType<typeof setInterval> | null = null;
    if (deepMode) {
      const steps = [
        'Spotting the legal issues in the facts...',
        'Researching applicable law for each issue...',
        'Building the strongest argument on each side...',
        'Simulating the opposing side\'s response...',
        'Weighing everything into one strategy...',
        'Drafting as a senior advocate would...',
      ];
      let stepIndex = 0;
      setGenerateStepMessage(steps[0]);
      stepInterval = setInterval(() => {
        stepIndex = Math.min(stepIndex + 1, steps.length - 1);
        setGenerateStepMessage(steps[stepIndex]);
      }, 4000);
    }

    try {
      const { data } = await api.post('/drafts/generate', {
        draftType,
        language,
        title: `${draftTypes.find(d => d.value === draftType)?.label} Draft`,
        details: { partyA, partyB, court, caseDetails: details },
        // Senior Advocate Mode: run the full reasoning chain over the case
        // facts first, then draft grounded in that — instead of drafting
        // straight off the raw fields.
        deep: deepMode,
        caseFacts: deepMode ? details : undefined,
      });
      setDraft(data.data.content);
      setWasDeepDrafted(deepMode);
      toast.success(deepMode ? 'Draft generated (senior advocate mode)!' : 'Draft generated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed.');
    } finally {
      if (stepInterval) clearInterval(stepInterval);
      setIsGenerating(false);
    }
  };

  const handleSmartGenerate = async () => {
    if (!problemText.trim()) return toast.error('Please describe your problem first.');
    setIsSmartGenerating(true);
    setSmartDraft(null);
    setSmartDeepResult(null);
    setClassification(null);
    setNeedsClarification(false);

    const steps = [
      'Understanding your problem...',
      'Deciding what document this needs...',
      'Spotting the legal issues in the facts...',
      'Researching applicable law for each issue...',
      'Building the strongest argument on each side...',
      'Simulating the opposing side\'s response...',
      'Drafting as a senior advocate would...',
    ];
    let stepIndex = 0;
    setSmartStepMessage(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      setSmartStepMessage(steps[stepIndex]);
    }, 4000);

    try {
      const { data } = await api.post('/drafts/generate', {
        problemText, language, partyA, partyB, court,
      });

      if (data.data.needsClarification) {
        setClassification(data.data.classification);
        setNeedsClarification(true);
        toast('Need a bit more detail to pick the right document.', { icon: '🤔' });
      } else {
        setClassification(data.data.classification);
        setSmartDeepResult(data.data.deepAnalysis || null);
        setSmartDraft(data.data.content);
        toast.success(`Drafted as ${draftTypeLabels[data.data.draft_type] || data.data.draft_type}!`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Analysis failed.');
    } finally {
      clearInterval(stepInterval);
      setIsSmartGenerating(false);
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

        {/* Mode switcher */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-navy-900 rounded-lg w-fit">
          <button
            onClick={() => setMode('smart')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              mode === 'smart'
                ? 'bg-white dark:bg-navy-800 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <Sparkles className="w-4 h-4" /> Describe My Problem
          </button>
          <button
            onClick={() => setMode('manual')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              mode === 'manual'
                ? 'bg-white dark:bg-navy-800 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <ListChecks className="w-4 h-4" /> Pick Draft Type Myself
          </button>
        </div>

        {/* ============================================================ */}
        {/* SMART MODE: describe the problem, AI decides & drafts        */}
        {/* ============================================================ */}
        {mode === 'smart' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Describe Your Problem
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  label="What's going on? (as much detail as you'd give an advocate)"
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  placeholder="e.g. Mera bhai ko police nay chori kay ilzam mein giraftar kiya hai, FIR thane mein darj ho chuki hai, wo abhi tak court mein pesh nahi hua..."
                  rows={10}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Party A (You / your side) — optional" value={partyA} onChange={(e) => setPartyA(e.target.value)} placeholder="Name" />
                  <Input label="Party B (Other side) — optional" value={partyB} onChange={(e) => setPartyB(e.target.value)} placeholder="Name" />
                </div>
                <Input label="Court Name — optional" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="e.g. Civil Court Lahore" />

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

                <p className="text-xs text-slate-400">
                  The system will decide what document your situation needs (bail, notice, suit, appeal, etc.),
                  reason through the issues on both sides like an advocate would, then draft it — no need to
                  pick a type yourself.
                </p>

                <Button onClick={handleSmartGenerate} isLoading={isSmartGenerating} className="w-full">
                  <Sparkles className="w-4 h-4" /> Analyze & Draft
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {isSmartGenerating && (
                <Card><CardContent className="flex flex-col items-center justify-center py-24">
                  <Brain className="w-8 h-8 animate-pulse text-primary-700 mb-3" />
                  <p className="text-sm text-slate-500 text-center max-w-xs">{smartStepMessage}</p>
                  <p className="text-xs text-slate-400 mt-2">This takes longer than picking a type yourself — worth the wait.</p>
                </CardContent></Card>
              )}

              {needsClarification && classification && !isSmartGenerating && (
                <Card className="border-amber-300 dark:border-amber-800">
                  <CardHeader>
                    <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-600" /> Need a bit more detail
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{classification.reasoning}</p>
                    {classification.clarifying_question && (
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{classification.clarifying_question}</p>
                    )}
                    <p className="text-xs text-slate-400 pt-1">Add more detail to the box on the left and try again.</p>
                  </CardContent>
                </Card>
              )}

              {classification?.draft_type && !needsClarification && !isSmartGenerating && (
                <Card className="border-primary-300 dark:border-primary-800">
                  <CardHeader>
                    <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary-600" /> Advocate's Assessment
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">
                      <span className="text-slate-400">Determined this needs a: </span>
                      <span className="font-semibold text-primary-700 dark:text-primary-400">
                        {draftTypeLabels[classification.draft_type] || classification.draft_type}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{classification.reasoning}</p>
                  </CardContent>
                </Card>
              )}

              {smartDeepResult && !isSmartGenerating && <DeepAnalysisResult data={smartDeepResult} />}

              {smartDraft && !isSmartGenerating && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                      Generated Draft
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded-full">
                        <Brain className="w-3 h-3" /> Senior Advocate Mode
                      </span>
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(smartDraft); toast.success('Copied!'); }}>
                      <Download className="w-4 h-4" /> Copy
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      'prose-legal prose-sm max-w-none text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-navy-950 rounded-lg p-5',
                      language === 'urdu' && 'urdu-text'
                    )}>
                      <ReactMarkdown>{smartDraft}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!isSmartGenerating && !classification && !smartDraft && (
                <Card><CardContent className="flex flex-col items-center justify-center py-24 text-center">
                  <Sparkles className="w-10 h-10 text-slate-300 dark:text-navy-700 mb-3" />
                  <p className="text-sm text-slate-400">Describe your problem — the right document and a full draft will appear here</p>
                </CardContent></Card>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MANUAL MODE: user picks the draft type themselves            */}
        {/* ============================================================ */}
        {mode === 'manual' && (
        <div className="grid lg:grid-cols-2 gap-6">
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

              {/* Senior Advocate Mode */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-navy-800 cursor-pointer hover:border-primary-300 transition-colors">
                <input
                  type="checkbox"
                  checked={deepMode}
                  onChange={(e) => setDeepMode(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Brain className="w-4 h-4" /> Deep Analysis — Senior Advocate Mode
                  </span>
                  <span className="block text-xs text-slate-400 mt-0.5">
                    Reasons through the case facts first — spots issues, researches law, argues both sides,
                    simulates the opponent's rebuttal — then drafts grounded in that strategy. Slower
                    (~30-50s) but far closer to how a real advocate prepares a document.
                  </span>
                </span>
              </label>

              <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full">
                <FileSignature className="w-4 h-4" /> Generate Draft
              </Button>
            </CardContent>
          </Card>

          <div>
            {isGenerating && (
              <Card><CardContent className="flex flex-col items-center justify-center py-24">
                {deepMode ? (
                  <>
                    <Brain className="w-8 h-8 animate-pulse text-primary-700 mb-3" />
                    <p className="text-sm text-slate-500 text-center max-w-xs">{generateStepMessage}</p>
                    <p className="text-xs text-slate-400 mt-2">This takes longer than a normal draft — worth the wait.</p>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-primary-700 mb-3" />
                    <p className="text-sm text-slate-500">Drafting your document...</p>
                  </>
                )}
              </CardContent></Card>
            )}

            {draft && !isGenerating && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                    Generated Draft
                    {wasDeepDrafted && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded-full">
                        <Brain className="w-3 h-3" /> Senior Advocate Mode
                      </span>
                    )}
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(draft); toast.success('Copied!'); }}>
                    <Download className="w-4 h-4" /> Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    'prose-legal prose-sm max-w-none text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-navy-950 rounded-lg p-5',
                    language === 'urdu' && 'urdu-text'
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
        )}

        <Disclaimer />
      </div>
    </DashboardShell>
  );
}
