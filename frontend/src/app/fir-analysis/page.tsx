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
import api from '@/lib/api';
import {
  FileWarning, Loader2, Scale, AlertTriangle, CheckCircle2,
  ShieldAlert, ListChecks, Download, FileSignature
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
  const [isGeneratingBail, setIsGeneratingBail] = useState<string | null>(null);
  const [includeLiveSearch, setIncludeLiveSearch] = useState(false);

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
    try {
      const { data } = await api.post('/analysis/fir', { text: firText, documentId, includeLiveSearch });
      setAnalysis(data.data.raw);
      setAnalysisId(data.data.analysis.id);
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

            {analysis && !isAnalyzing && (
              <>
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

            {!analysis && !isAnalyzing && (
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
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(bailDraft);
                toast.success('Copied to clipboard');
              }}>
                <Download className="w-4 h-4" /> Copy
              </Button>
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
