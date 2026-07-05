'use client';

import { useState, useEffect } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader } from '@/components/ui';
import Button from '@/components/ui/Button';
import Disclaimer from '@/components/legal/Disclaimer';
import api from '@/lib/api';
import { BookOpen, Search, Loader2, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

export default function ResearchPage() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    api.get('/research/history').then(({ data }) => setHistory(data.data)).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return toast.error('Please enter a research query.');
    setIsSearching(true);
    setResult(null);
    try {
      const { data } = await api.post('/research', { query });
      setResult(data.data.content);
      toast.success('Research complete!');
      api.get('/research/history').then(({ data }) => setHistory(data.data)).catch(() => {});
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Research failed.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-100 dark:bg-indigo-950 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Legal Research</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Research Pakistani statutes, case law, and constitutional provisions</p>
          </div>
        </div>

        <Card>
          <CardContent>
            <div className="flex gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. What are the grounds for divorce under the Dissolution of Muslim Marriages Act?"
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button onClick={handleSearch} isLoading={isSearching}>
                <Search className="w-4 h-4" /> Research
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isSearching && (
              <Card><CardContent className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-700 mb-3" />
                <p className="text-sm text-slate-500">Researching Pakistani law...</p>
              </CardContent></Card>
            )}

            {result && !isSearching && (
              <Card>
                <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Research Findings</h3></CardHeader>
                <CardContent>
                  <div className="prose-legal prose-sm max-w-none text-slate-700 dark:text-slate-300">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {!result && !isSearching && (
              <Card><CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 dark:text-navy-700 mb-3" />
                <p className="text-sm text-slate-400">Enter a legal question to begin research</p>
              </CardContent></Card>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-navy-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Recent Searches
            </h3>
            <Card>
              <CardContent className="space-y-1 p-2">
                {history.length === 0 && <p className="text-xs text-slate-400 p-3">No research history yet</p>}
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setQuery(h.query)}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800 text-xs text-slate-600 dark:text-slate-400 transition-colors"
                  >
                    {h.query}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Disclaimer />
      </div>
    </DashboardShell>
  );
}
