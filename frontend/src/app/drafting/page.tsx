'use client';

import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader } from '@/components/ui';
import Button from '@/components/ui/Button';
import { Textarea, Input } from '@/components/ui';
import Disclaimer from '@/components/legal/Disclaimer';
import api from '@/lib/api';
import { PenTool, Loader2, Download, FileSignature, Languages } from 'lucide-react';
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

export default function DraftingPage() {
  const [draftType, setDraftType] = useState('bail_application');
  const [language, setLanguage] = useState('english');
  const [details, setDetails] = useState('');
  const [partyA, setPartyA] = useState('');
  const [partyB, setPartyB] = useState('');
  const [court, setCourt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

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

              <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full">
                <FileSignature className="w-4 h-4" /> Generate Draft
              </Button>
            </CardContent>
          </Card>

          <div>
            {isGenerating && (
              <Card><CardContent className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary-700 mb-3" />
                <p className="text-sm text-slate-500">Drafting your document...</p>
              </CardContent></Card>
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

        <Disclaimer />
      </div>
    </DashboardShell>
  );
}
