'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge, Textarea } from '@/components/ui';
import Button from '@/components/ui/Button';
import Disclaimer from '@/components/legal/Disclaimer';
import api from '@/lib/api';
import { FileText, Loader2, Scale, FileSignature, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

function NoticeAnalysisContent() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');

  const [noticeText, setNoticeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);

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
      const { data } = await api.post('/analysis/notice', { text: noticeText, documentId });
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
      const { data } = await api.post(`/analysis/notice/${analysisId}/reply`, {});
      setReply(data.data.content);
      toast.success('Reply notice drafted!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed.');
    } finally {
      setIsGeneratingReply(false);
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
              <Textarea
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder="Paste the legal notice text here..."
                rows={16}
                className="font-mono text-xs"
              />
              <Button onClick={handleAnalyze} isLoading={isAnalyzing} className="w-full mt-4">
                <Scale className="w-4 h-4" /> Analyze Notice
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {isAnalyzing && (
              <Card><CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-700 mb-3" />
                <p className="text-sm text-slate-500">Analyzing notice...</p>
              </CardContent></Card>
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

                <Button onClick={handleGenerateReply} isLoading={isGeneratingReply} className="w-full">
                  <FileSignature className="w-4 h-4" /> Generate Reply Notice
                </Button>
              </>
            )}

            {!analysis && !isAnalyzing && (
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
