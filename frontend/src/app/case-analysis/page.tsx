'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge, Textarea } from '@/components/ui';
import Button from '@/components/ui/Button';
import Disclaimer from '@/components/legal/Disclaimer';
import InlineDocumentUpload from '@/components/legal/InlineDocumentUpload';
import LiveSearchToggle from '@/components/legal/LiveSearchToggle';
import api from '@/lib/api';
import { FileSearch, Loader2, Scale } from 'lucide-react';
import toast from 'react-hot-toast';

function CaseAnalysisContent() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');

  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [includeLiveSearch, setIncludeLiveSearch] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    if (documentId) {
      api.get(`/documents/${documentId}/text`).then(({ data }) => setText(data.data.text || '')).catch(() => {});
    }
  }, [documentId]);

  const handleAnalyze = async () => {
    if (!text.trim()) return toast.error('Please provide document text.');
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const { data } = await api.post('/analysis/plaint', { text, documentId, includeLiveSearch });
      setAnalysis(data.data.analysis);
      toast.success('Analysis complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
            <FileSearch className="w-6 h-6 text-blue-700 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Case Analysis</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Analyze plaints, written statements, and objections for claims, issues & evidence requirements
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><h2 className="font-semibold text-navy-900 dark:text-white">Document Text</h2></CardHeader>
            <CardContent>
              <InlineDocumentUpload
                documentType="plaint"
                label="Upload the plaint, petition, contract, or any case document (PDF, scanned photo, or Word file)"
                onExtracted={(t) => setText(t)}
              />
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the plaint, written statement, or objection text here, or upload a document above..." rows={18} className="font-mono text-xs" />
              <div className="mt-4">
                <LiveSearchToggle checked={includeLiveSearch} onChange={setIncludeLiveSearch} />
              </div>
              <Button onClick={handleAnalyze} isLoading={isAnalyzing} className="w-full mt-4">
                <Scale className="w-4 h-4" /> Analyze Document
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {isAnalyzing && (
              <Card><CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-700 mb-3" />
                <p className="text-sm text-slate-500">Analyzing document...</p>
              </CardContent></Card>
            )}

            {analysis && !isAnalyzing && (
              <>
                <Card>
                  <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Summary</h3></CardHeader>
                  <CardContent><p className="text-sm text-slate-600 dark:text-slate-400">{analysis.summary}</p></CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-xs text-slate-400 mb-1">Case Type</p><p className="font-medium text-navy-900 dark:text-white">{analysis.case_type || 'N/A'}</p></div>
                      <div><p className="text-xs text-slate-400 mb-1">Court</p><p className="font-medium text-navy-900 dark:text-white">{analysis.court_name || 'N/A'}</p></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Claims & Relief Sought</h3></CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1">{analysis.claims?.map((c: string, i: number) => <li key={i} className="text-sm text-slate-600 dark:text-slate-400">• {c}</li>)}</ul>
                    {analysis.relief_sought?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">{analysis.relief_sought.map((r: string, i: number) => <Badge key={i} variant="info">{r}</Badge>)}</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Evidence Required</h3></CardHeader>
                  <CardContent>
                    <ul className="space-y-1">{analysis.evidence_required?.map((e: string, i: number) => <li key={i} className="text-sm text-slate-600 dark:text-slate-400">• {e}</li>)}</ul>
                  </CardContent>
                </Card>

                <Card className="border-primary-300 dark:border-primary-800">
                  <CardHeader><h3 className="font-semibold text-primary-700 dark:text-primary-400">Preliminary Objections</h3></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">{analysis.preliminary_objections?.map((o: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2"><span className="text-primary-500 font-bold">{i + 1}.</span> {o}</li>
                    ))}</ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Recommended Response</h3></CardHeader>
                  <CardContent><p className="text-sm text-slate-600 dark:text-slate-400">{analysis.recommended_response}</p></CardContent>
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
              </>
            )}

            {!analysis && !isAnalyzing && (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileSearch className="w-10 h-10 text-slate-300 dark:text-navy-700 mb-3" />
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

export default function CaseAnalysisPage() {
  return (
    <Suspense fallback={<DashboardShell><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></DashboardShell>}>
      <CaseAnalysisContent />
    </Suspense>
  );
}
