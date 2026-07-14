'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge, Textarea } from '@/components/ui';
import Button from '@/components/ui/Button';
import Disclaimer from '@/components/legal/Disclaimer';
import InlineDocumentUpload from '@/components/legal/InlineDocumentUpload';
import LiveSearchToggle from '@/components/legal/LiveSearchToggle';
import DeepAnalysisResult, { DeepAnalysisData } from '@/components/legal/DeepAnalysisResult';
import api from '@/lib/api';
import { FileText, Loader2, Scale, FileSignature, Download, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

function NoticeAnalysisContent() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');

  const [noticeText, setNoticeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [includeLiveSearch, setIncludeLiveSearch] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [deepResult, setDeepResult] = useState<DeepAnalysisData | null>(null);
  const [deepStepMessage, setDeepStepMessage] = useState('');

  useEffect(() => {
    if (documentId) {
      api.get(`/documents/${documentId}/text`).then(({ data }) => setNoticeText(data.data.text || '')).catch(() => {});
    }
  }, [documentId]);

  const handleAnalyze = async () => {
    if (!noticeText.trim()) return toast.error('Please provide notice text.');
    setIsAnalyzing(true);
    setAnalysis(null);
    setReply(null);
    try {
      const { data } = await api.post('/analysis/notice', { text: noticeText, documentId, includeLiveSearch });
      setAnalysis(data.data.raw);
      setAnalysisId(data.data.analysis.id);
      toast.success('Notice analysis complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!analysisId) return;
    setIsGeneratingReply(true);
    try {
      const { data } = await api.post(`/analysis/notice/${analysisId}/reply`, {
        deepAnalysis: deepResult || null,
      });
      setReply(data.data.content);
      toast.success(deepResult ? 'Reply drafted (senior advocate mode)!' : 'Reply notice drafted!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed.');
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleDeepAnalyze = async () => {
    if (!noticeText.trim()) return toast.error('Please provide notice text.');
    setIsDeepAnalyzing(true);
    setDeepResult(null);

    const steps = [
      'Spotting the legal issues in the notice...',
      'Researching applicable law for each issue...',
      'Building the strongest argument on each side...',
      'Simulating the sender\'s likely rebuttal...',
      'Weighing everything into one final strategy...',
    ];
    let stepIndex = 0;
    setDeepStepMessage(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      setDeepStepMessage(steps[stepIndex]);
    }, 4000);

    try {
      const { data } = await api.post('/analysis/notice/deep', { text: noticeText, documentId });
      setDeepResult(data.data);
      toast.success('Deep analysis complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Deep analysis failed.');
    } finally {
      clearInterval(stepInterval);
      setIsDeepAnalyzing(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-amber-100 dark:bg-amber-950 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Legal Notice Analysis</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Summarize demands, legal issues & generate replies</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><h2 className="font-semibold text-navy-900 dark:text-white">Notice Text</h2></CardHeader>
            <CardContent>
              <InlineDocumentUpload
                documentType="notice"
                label="Upload the legal notice (PDF, scanned photo, or Word file)"
                onExtracted={(text) => setNoticeText(text)}
              />
              <Textarea
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder="Paste the legal notice text here, or upload a document above..."
                rows={16}
                className="font-mono text-xs"
              />
              <div className="mt-4">
                <LiveSearchToggle checked={includeLiveSearch} onChange={setIncludeLiveSearch} />
              </div>
              <Button onClick={handleAnalyze} isLoading={isAnalyzing} className="w-full mt-4">
                <Scale className="w-4 h-4" /> Analyze Notice
              </Button>
              <Button
                onClick={handleDeepAnalyze}
                isLoading={isDeepAnalyzing}
                variant="outline"
                className="w-full mt-2"
              >
                <Brain className="w-4 h-4" /> Deep Analysis — Senior Advocate Mode
              </Button>
              <p className="text-xs text-slate-400 mt-1.5 text-center">
                Slower (~20-40s) but reasons through each issue separately, arguing both sides before
                concluding — closer to how an advocate actually works a case.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {isAnalyzing && (
              <Card><CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-700 mb-3" />
                <p className="text-sm text-slate-500">Analyzing notice...</p>
              </CardContent></Card>
            )}

            {isDeepAnalyzing && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Brain className="w-8 h-8 animate-pulse text-primary-700 mb-3" />
                  <p className="text-sm text-slate-500 text-center max-w-xs">{deepStepMessage}</p>
                  <p className="text-xs text-slate-400 mt-2">This takes longer than a normal analysis — worth the wait.</p>
                </CardContent>
              </Card>
            )}

            {deepResult && !isDeepAnalyzing && (
              <DeepAnalysisResult data={deepResult} />
            )}

            {analysis && !isAnalyzing && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <h3 className="font-semibold text-navy-900 dark:text-white">Summary</h3>
                    <Badge variant={analysis.urgency_level === 'High' ? 'danger' : analysis.urgency_level === 'Medium' ? 'warning' : 'success'}>
                      {analysis.urgency_level} Urgency
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{analysis.summary}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-xs text-slate-400 mb-1">Notice Type</p><p className="font-medium text-navy-900 dark:text-white">{analysis.notice_type || 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400 mb-1">Demand Amount</p><p className="font-medium text-navy-900 dark:text-white">{analysis.demand_amount ? `PKR ${analysis.demand_amount.toLocaleString()}` : 'N/A'}</p></div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">Demands</p>
                      <ul className="space-y-1">{analysis.demands?.map((d: string, i: number) => <li key={i} className="text-slate-600 dark:text-slate-400">• {d}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">Legal Issues</p>
                      <div className="flex flex-wrap gap-1.5">{analysis.legal_issues?.map((l: string, i: number) => <Badge key={i} variant="warning">{l}</Badge>)}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Defence Strategy</h3></CardHeader>
                  <CardContent><p className="text-sm text-slate-600 dark:text-slate-400">{analysis.defence_strategy}</p></CardContent>
                </Card>

                {analysis.legal_references?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                        <Scale className="w-4 h-4" /> Legal References
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {analysis.legal_references.map((ref: string, i: number) => (
                          <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                            <span className="text-primary-500">§</span> {ref}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-slate-400 mt-3">Always verify citations with a qualified advocate before relying on them in court.</p>
                    </CardContent>
                  </Card>
                )}

                {deepResult ? (
                  <p className="text-xs text-primary-700 dark:text-primary-400 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" /> Reply will be drafted using the senior advocate deep analysis above.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Tip: run Deep Analysis first so the reply is grounded in full issue-by-issue reasoning.
                  </p>
                )}
                <Button onClick={handleGenerateReply} isLoading={isGeneratingReply} className="w-full">
                  <FileSignature className="w-4 h-4" /> Generate Reply Notice
                </Button>
              </>
            )}

            {!analysis && !isAnalyzing && !deepResult && !isDeepAnalyzing && (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-10 h-10 text-slate-300 dark:text-navy-700 mb-3" />
                <p className="text-sm text-slate-400">Analysis results will appear here</p>
              </CardContent></Card>
            )}
          </div>
        </div>

        {reply && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2"><FileSignature className="w-4 h-4" /> Generated Reply Notice</h3>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(reply); toast.success('Copied!'); }}>
                <Download className="w-4 h-4" /> Copy
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose-legal prose-sm max-w-none text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-navy-950 rounded-lg p-5">
                <ReactMarkdown>{reply}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        <Disclaimer />
      </div>
    </DashboardShell>
  );
}

export default function NoticeAnalysisPage() {
  return (
    <Suspense fallback={<DashboardShell><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></DashboardShell>}>
      <NoticeAnalysisContent />
    </Suspense>
  );
}
