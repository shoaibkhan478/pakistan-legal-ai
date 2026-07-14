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
import { Gavel, Loader2, Scale, Brain } from 'lucide-react';
import toast from 'react-hot-toast';

function JudgmentAnalysisContent() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');

  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [includeLiveSearch, setIncludeLiveSearch] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [deepResult, setDeepResult] = useState<DeepAnalysisData | null>(null);
  const [deepStepMessage, setDeepStepMessage] = useState('');

  useEffect(() => {
    if (documentId) {
      api.get(`/documents/${documentId}/text`).then(({ data }) => setText(data.data.text || '')).catch(() => {});
    }
  }, [documentId]);

  const handleAnalyze = async () => {
    if (!text.trim()) return toast.error('Please provide judgment text.');
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const { data } = await api.post('/analysis/judgment', { text, documentId, includeLiveSearch });
      setAnalysis(data.data.raw);
      toast.success('Judgment analysis complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeepAnalyze = async () => {
    if (!text.trim()) return toast.error('Please provide judgment text.');
    setIsDeepAnalyzing(true);
    setDeepResult(null);

    const steps = [
      'Spotting the strongest appealable issues...',
      'Researching applicable law for each issue...',
      'Building the strongest argument on each side...',
      'Simulating the respondent\'s likely rebuttal...',
      'Weighing everything into one appeal strategy...',
    ];
    let stepIndex = 0;
    setDeepStepMessage(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      setDeepStepMessage(steps[stepIndex]);
    }, 4000);

    try {
      const { data } = await api.post('/analysis/judgment/deep', { text, documentId });
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
          <div className="w-11 h-11 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center">
            <Gavel className="w-6 h-6 text-purple-700 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Judgment Analysis</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Extract facts, issues, findings & generate appeal grounds</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><h2 className="font-semibold text-navy-900 dark:text-white">Judgment Text</h2></CardHeader>
            <CardContent>
              <InlineDocumentUpload
                documentType="judgment"
                label="Upload the court judgment/order (PDF, scanned photo, or Word file)"
                onExtracted={(t) => setText(t)}
              />
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the court judgment text here, or upload a document above..." rows={18} className="font-mono text-xs" />
              <div className="mt-4">
                <LiveSearchToggle checked={includeLiveSearch} onChange={setIncludeLiveSearch} />
              </div>
              <Button onClick={handleAnalyze} isLoading={isAnalyzing} className="w-full mt-4">
                <Scale className="w-4 h-4" /> Analyze Judgment
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
                <p className="text-sm text-slate-500">Analyzing judgment...</p>
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
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-xs text-slate-400 mb-1">Court</p><p className="font-medium text-navy-900 dark:text-white">{analysis.court_name || 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400 mb-1">Case Number</p><p className="font-medium text-navy-900 dark:text-white">{analysis.case_number || 'N/A'}</p></div>
                    </div>
                    {analysis.parties && (
                      <div><p className="text-xs text-slate-400 mb-1">Parties</p><p className="text-slate-700 dark:text-slate-300">{analysis.parties.plaintiff} vs. {analysis.parties.defendant}</p></div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Facts</h3></CardHeader>
                  <CardContent><p className="text-sm text-slate-600 dark:text-slate-400">{analysis.facts}</p></CardContent>
                </Card>

                <Card>
                  <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Issues</h3></CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{analysis.issues}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Findings & Decision</h3></CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400"><strong>Findings:</strong> {analysis.findings}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400"><strong>Decision:</strong> {analysis.decision}</p>
                  </CardContent>
                </Card>

                <Card className="border-primary-300 dark:border-primary-800">
                  <CardHeader><h3 className="font-semibold text-primary-700 dark:text-primary-400">Suggested Appeal Grounds</h3></CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{analysis.appeal_grounds}</p>
                  </CardContent>
                </Card>

                {analysis.consistency_assessment && (
                  <Card className="border-amber-300 dark:border-amber-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <h3 className="font-semibold text-navy-900 dark:text-white">Consistency With Settled Law</h3>
                      <Badge variant={
                        analysis.consistency_assessment.is_consistent_with_settled_law === 'consistent' ? 'success'
                        : analysis.consistency_assessment.is_consistent_with_settled_law === 'inconsistent' ? 'danger'
                        : 'warning'
                      }>
                        {analysis.consistency_assessment.is_consistent_with_settled_law?.replace(/_/g, ' ')}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{analysis.consistency_assessment.reasoning}</p>
                      {analysis.consistency_assessment.conflicts_or_errors?.length > 0 && (
                        <ul className="space-y-1 mt-2">
                          {analysis.consistency_assessment.conflicts_or_errors.map((c: string, i: number) => (
                            <li key={i} className="text-sm text-amber-700 dark:text-amber-400 flex gap-2"><span>⚠</span> {c}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )}

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

                {analysis.precedents_cited?.length > 0 && (
                  <Card>
                    <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Precedents Cited</h3></CardHeader>
                    <CardContent className="flex flex-wrap gap-1.5">
                      {analysis.precedents_cited.map((p: string, i: number) => <Badge key={i} variant="info">{p}</Badge>)}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {!analysis && !isAnalyzing && !deepResult && !isDeepAnalyzing && (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Gavel className="w-10 h-10 text-slate-300 dark:text-navy-700 mb-3" />
                <p className="text-sm text-slate-400">Analysis results will appear here</p>
              </CardContent></Card>
            )}
          </div>
        </div>

        <Disclaimer />
      </div>
    </DashboardShell>
  );
}

export default function JudgmentAnalysisPage() {
  return (
    <Suspense fallback={<DashboardShell><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></DashboardShell>}>
      <JudgmentAnalysisContent />
    </Suspense>
  );
}
