'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui';
import Disclaimer from '@/components/legal/Disclaimer';
import InlineDocumentUpload from '@/components/legal/InlineDocumentUpload';
import LiveSearchToggle from '@/components/legal/LiveSearchToggle';
import DeepAnalysisResult, { DeepAnalysisData } from '@/components/legal/DeepAnalysisResult';
import api from '@/lib/api';
import {
  FileWarning, Loader2, Scale, AlertTriangle, CheckCircle2,
  ShieldAlert, ListChecks, Copy, FileSignature, FileDown, Brain
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

function FIRAnalysisContent() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');

  const [firText, setFirText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [bailDraft, setBailDraft] = useState<string | null>(null);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);
  const [isGeneratingBail, setIsGeneratingBail] = useState<string | null>(null);
  const [includeLiveSearch, setIncludeLiveSearch] = useState(false);
  const [liveSearchStatus, setLiveSearchStatus] = useState<string | null>(null);
  const [seniorReviewed, setSeniorReviewed] = useState(false);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [deepResult, setDeepResult] = useState<DeepAnalysisData | null>(null);
  const [deepStepMessage, setDeepStepMessage] = useState('');

  useEffect(() => {
    if (documentId) {
      api.get(`/documents/${documentId}/text`).then(({ data }) => {
        setFirText(data.data.text || '');
      }).catch(() => {});
    }
  }, [documentId]);

  const handleAnalyze = async () => {
    if (!firText.trim()) {
      toast.error('Please provide FIR text to analyze.');
      return;
    }
    setIsAnalyzing(true);
    setAnalysis(null);
    setBailDraft(null);
    setLiveSearchStatus(null);
    setSeniorReviewed(false);
    try {
      const { data } = await api.post('/analysis/fir', { text: firText, documentId, includeLiveSearch });
      setAnalysis(data.data.raw);
      setAnalysisId(data.data.analysis.id);
      setLiveSearchStatus(data.data.liveSearchStatus || null);
      setSeniorReviewed(!!data.data.seniorReviewed);
      toast.success('FIR analysis complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateBail = async (bailType: 'pre_arrest' | 'post_arrest') => {
    if (!analysisId) return;
    setIsGeneratingBail(bailType);
    try {
      const { data } = await api.post(`/analysis/fir/${analysisId}/bail`, { bailType });
      setBailDraft(data.data.content);
      toast.success('Bail application drafted!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed.');
    } finally {
      setIsGeneratingBail(null);
    }
  };

  const handleDeepAnalyze = async () => {
    if (!firText.trim()) {
      toast.error('Please provide FIR text to analyze.');
      return;
    }
    setIsDeepAnalyzing(true);
    setDeepResult(null);

    // The chain takes 10-20+ seconds (5-8 chained AI calls) with no
    // intermediate progress from the backend — this is a single request/
    // response, not a stream. Rotating status text sets the right
    // expectation instead of a plain frozen spinner.
    const steps = [
      'Spotting the legal issues in the facts...',
      'Researching applicable law for each issue...',
      'Building the strongest argument on each side...',
      'Simulating the opposing counsel\'s response...',
      'Weighing everything into one final strategy...',
    ];
    let stepIndex = 0;
    setDeepStepMessage(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      setDeepStepMessage(steps[stepIndex]);
    }, 4000);

    try {
      const { data } = await api.post('/analysis/fir/deep', { text: firText, documentId });
      setDeepResult(data.data);
      toast.success('Deep analysis complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Deep analysis failed.');
    } finally {
      clearInterval(stepInterval);
      setIsDeepAnalyzing(false);
    }
  };

  const bailColor = analysis?.bail_possibility?.toLowerCase().includes('non')
    ? 'danger' : analysis?.bail_possibility?.toLowerCase().includes('condition')
    ? 'warning' : 'success';

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
            <FileWarning className="w-6 h-6 text-red-700 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">FIR Analysis</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Extract parties, sections, allegations, timeline & bail possibility
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-navy-900 dark:text-white">FIR Text</h2>
            </CardHeader>
            <CardContent>
              <InlineDocumentUpload
                documentType="fir"
                label="Upload the FIR (PDF, scanned photo, or Word file)"
                onExtracted={(text) => setFirText(text)}
              />
              <Textarea
                value={firText}
                onChange={(e) => setFirText(e.target.value)}
                placeholder="Paste the FIR text here, or upload a document above..."
                rows={16}
                className="font-mono text-xs"
              />
              <div className="mt-4">
                <LiveSearchToggle checked={includeLiveSearch} onChange={setIncludeLiveSearch} />
              </div>
              <Button onClick={handleAnalyze} isLoading={isAnalyzing} className="w-full mt-4">
                <Scale className="w-4 h-4" /> Analyze FIR
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

          {/* Results */}
          <div className="space-y-4">
            {isAnalyzing && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-700 mb-3" />
                  <p className="text-sm text-slate-500">Analyzing FIR with AI...</p>
                </CardContent>
              </Card>
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
                {liveSearchStatus && liveSearchStatus !== 'disabled' && (
                  <div className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-2 ${
                    liveSearchStatus === 'success'
                      ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                      : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
                  }`}>
                    {liveSearchStatus === 'success' ? (
                      <>✅ Live case-law search completed — recent/confirmed precedents (if any) are woven into the analysis below.</>
                    ) : liveSearchStatus === 'timeout' ? (
                      <>⚠️ Live search took too long and was skipped — this analysis uses the document text and AI's own knowledge only.</>
                    ) : liveSearchStatus === 'quota_exceeded' ? (
                      <>⚠️ Live search skipped (AI service request limit reached) — this analysis uses the document text and AI's own knowledge only.</>
                    ) : (
                      <>⚠️ Live search failed and was skipped — this analysis uses the document text and AI's own knowledge only.</>
                    )}
                  </div>
                )}

                {seniorReviewed && analysis.confidence_assessment && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <h3 className="font-semibold text-navy-900 dark:text-white">👨‍⚖️ Senior Review</h3>
                      <Badge variant={(
                        analysis.confidence_assessment.overall === 'high' ? 'success'
                        : analysis.confidence_assessment.overall === 'medium' ? 'warning'
                        : 'danger'
                      ) as any}>
                        {analysis.confidence_assessment.overall === 'high' ? 'High Confidence'
                          : analysis.confidence_assessment.overall === 'medium' ? 'Medium Confidence'
                          : 'Low Confidence — Verify Carefully'}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        This analysis was drafted, then independently re-checked by a second AI pass acting as a senior reviewer — it corrected unsupported claims and softened overstated language before you saw it.
                      </p>
                      {analysis.confidence_assessment.caveats?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Please verify independently:</p>
                          <ul className="space-y-1">
                            {analysis.confidence_assessment.caveats.map((c: string, i: number) => (
                              <li key={i} className="text-sm text-slate-600 dark:text-slate-400">• {c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.review_notes?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Corrections made during review:</p>
                          <ul className="space-y-1">
                            {analysis.review_notes.map((n: string, i: number) => (
                              <li key={i} className="text-sm text-slate-600 dark:text-slate-400">• {n}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Overview */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <h3 className="font-semibold text-navy-900 dark:text-white">Bail Assessment</h3>
                    <Badge variant={bailColor as any}>{analysis.bail_possibility}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{analysis.bail_reasoning}</p>
                  </CardContent>
                </Card>

                {/* Parties & Sections */}
                <Card>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">FIR Number</p>
                        <p className="font-medium text-navy-900 dark:text-white">{analysis.fir_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Police Station</p>
                        <p className="font-medium text-navy-900 dark:text-white">{analysis.police_station || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">Sections Applied</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.sections_applied?.map((s: string, i: number) => (
                          <Badge key={i} variant="danger">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    {analysis.accused_names?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1.5">Accused</p>
                        <p className="text-slate-700 dark:text-slate-300">{analysis.accused_names.join(', ')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weak / Strong points */}
                <Card>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 dark:text-primary-400 mb-2">
                        <CheckCircle2 className="w-4 h-4" /> Weak Points (Prosecution)
                      </p>
                      <ul className="space-y-1.5">
                        {analysis.weak_points?.map((w: string, i: number) => (
                          <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                            <span className="text-primary-500">•</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
                        <AlertTriangle className="w-4 h-4" /> Strong Points (Against Accused)
                      </p>
                      <ul className="space-y-1.5">
                        {analysis.strong_points?.map((s: string, i: number) => (
                          <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                            <span className="text-amber-500">•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Defence Suggestions */}
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                      <ListChecks className="w-4 h-4" /> Defence Suggestions
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.defence_suggestions?.map((d: string, i: number) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                          <span className="text-primary-500 font-bold">{i + 1}.</span> {d}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Legal References */}
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

                {/* Generate bail buttons */}
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" /> Generate Bail Application
                    </h3>
                  </CardHeader>
                  <CardContent className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      isLoading={isGeneratingBail === 'pre_arrest'}
                      onClick={() => handleGenerateBail('pre_arrest')}
                    >
                      Pre-Arrest Bail
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      isLoading={isGeneratingBail === 'post_arrest'}
                      onClick={() => handleGenerateBail('post_arrest')}
                    >
                      Post-Arrest Bail
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {!analysis && !isAnalyzing && !deepResult && !isDeepAnalyzing && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileWarning className="w-10 h-10 text-slate-300 dark:text-navy-700 mb-3" />
                  <p className="text-sm text-slate-400">Analysis results will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bail draft output */}
        {bailDraft && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
                <FileSignature className="w-4 h-4" /> Generated Bail Application
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(bailDraft);
                  toast.success('Copied to clipboard');
                }}>
                  <Copy className="w-4 h-4" /> Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isDownloadingWord}
                  onClick={async () => {
                    setIsDownloadingWord(true);
                    try {
                      const { downloadDraftAsWord } = await import('@/lib/docxExport');
                      await downloadDraftAsWord(
                        bailDraft,
                        `Bail_Application_${analysis?.fir_number || 'draft'}`
                      );
                      toast.success('Word document downloaded');
                    } catch (err) {
                      toast.error('Could not generate Word document.');
                    } finally {
                      setIsDownloadingWord(false);
                    }
                  }}
                >
                  <FileDown className="w-4 h-4" /> Download Word
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose-legal prose-sm max-w-none text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-navy-950 rounded-lg p-5 whitespace-pre-wrap">
                <ReactMarkdown>{bailDraft}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        <Disclaimer />
      </div>
    </DashboardShell>
  );
}

export default function FIRAnalysisPage() {
  return (
    <Suspense fallback={<DashboardShell><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></DashboardShell>}>
      <FIRAnalysisContent />
    </Suspense>
  );
}
