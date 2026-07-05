'use client';

import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge, Input } from '@/components/ui';
import Button from '@/components/ui/Button';
import Disclaimer from '@/components/legal/Disclaimer';
import api from '@/lib/api';
import { GraduationCap, Loader2, ListChecks, MessageCircleQuestion, NotebookPen, ScrollText, CheckCircle2, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const modes = [
  { value: 'mcq', label: 'MCQ Practice', icon: ListChecks },
  { value: 'viva', label: 'Viva Questions', icon: MessageCircleQuestion },
  { value: 'notes', label: 'Study Notes', icon: NotebookPen },
  { value: 'case_brief', label: 'Case Brief', icon: ScrollText },
];

export default function StudentModePage() {
  const [mode, setMode] = useState('mcq');
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mcqs, setMcqs] = useState<any[]>([]);
  const [vivaQuestions, setVivaQuestions] = useState<any[]>([]);
  const [notes, setNotes] = useState<string | null>(null);
  const [caseBrief, setCaseBrief] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const resetResults = () => {
    setMcqs([]); setVivaQuestions([]); setNotes(null); setCaseBrief(null);
    setSelectedAnswers({}); setShowResults(false);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return toast.error('Please enter a topic.');
    resetResults();
    setIsGenerating(true);

    try {
      if (mode === 'mcq') {
        const { data } = await api.post('/student/mcq', { topic, subject: subject || topic, count: 10 });
        setMcqs(data.data.mcqs);
      } else if (mode === 'viva') {
        const { data } = await api.post('/student/viva', { topic, subject: subject || topic, count: 12 });
        setVivaQuestions(data.data.questions);
      } else if (mode === 'notes') {
        const { data } = await api.post('/student/notes', { topic, subject: subject || topic });
        setNotes(data.data.content);
      } else if (mode === 'case_brief') {
        const { data } = await api.post('/student/case-brief', { caseName: topic });
        setCaseBrief(data.data.content);
      }
      toast.success('Generated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const score = mcqs.reduce((acc, q, i) => acc + (selectedAnswers[i] === q.correct_answer ? 1 : 0), 0);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-violet-100 dark:bg-violet-950 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-violet-700 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Law Student Mode</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">MCQs, viva prep, notes & case briefs for LLB/Bar exams</p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => { setMode(m.value); resetResults(); }}
                className={cn(
                  'p-4 rounded-xl border text-center transition-colors',
                  mode === m.value
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40'
                    : 'border-slate-200 dark:border-navy-800 hover:border-primary-300'
                )}
              >
                <Icon className={cn('w-6 h-6 mx-auto mb-2', mode === m.value ? 'text-primary-700 dark:text-primary-400' : 'text-slate-400')} />
                <p className={cn('text-xs font-medium', mode === m.value ? 'text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400')}>{m.label}</p>
              </button>
            );
          })}
        </div>

        <Card>
          <CardContent className="space-y-4">
            <Input
              label={mode === 'case_brief' ? 'Case Name' : 'Topic'}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={mode === 'case_brief' ? 'e.g. Benazir Bhutto v. Federation of Pakistan' : 'e.g. Anticipatory Bail under Section 498 CrPC'}
            />
            {mode !== 'case_brief' && (
              <Input label="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Criminal Procedure Code" />
            )}
            <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full">Generate</Button>
          </CardContent>
        </Card>

        {isGenerating && (
          <Card><CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-700 mb-3" />
            <p className="text-sm text-slate-500">Generating study materials...</p>
          </CardContent></Card>
        )}

        {/* MCQ Mode */}
        {mcqs.length > 0 && !isGenerating && (
          <div className="space-y-4">
            {showResults && (
              <Card className="border-primary-300 dark:border-primary-800">
                <CardContent className="text-center py-6">
                  <p className="text-3xl font-bold text-primary-700 dark:text-primary-400">{score} / {mcqs.length}</p>
                  <p className="text-sm text-slate-500 mt-1">Your Score</p>
                </CardContent>
              </Card>
            )}
            {mcqs.map((q, i) => (
              <Card key={i}>
                <CardContent>
                  <p className="font-medium text-navy-900 dark:text-white mb-3">{i + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {Object.entries(q.options).map(([key, val]: [string, any]) => {
                      const isSelected = selectedAnswers[i] === key;
                      const isCorrect = key === q.correct_answer;
                      return (
                        <button
                          key={key}
                          disabled={showResults}
                          onClick={() => setSelectedAnswers((prev) => ({ ...prev, [i]: key }))}
                          className={cn(
                            'w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors flex items-center justify-between',
                            showResults && isCorrect && 'border-primary-500 bg-primary-50 dark:bg-primary-950/30',
                            showResults && isSelected && !isCorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30',
                            !showResults && isSelected && 'border-primary-500 bg-primary-50 dark:bg-primary-950/30',
                            !showResults && !isSelected && 'border-slate-200 dark:border-navy-800'
                          )}
                        >
                          <span><strong>{key}.</strong> {val}</span>
                          {showResults && isCorrect && <CheckCircle2 className="w-4 h-4 text-primary-600" />}
                          {showResults && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500" />}
                        </button>
                      );
                    })}
                  </div>
                  {showResults && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 bg-slate-50 dark:bg-navy-800 p-3 rounded-lg">
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            {!showResults && (
              <Button onClick={() => setShowResults(true)} className="w-full">Submit Answers</Button>
            )}
          </div>
        )}

        {/* Viva Mode */}
        {vivaQuestions.length > 0 && !isGenerating && (
          <div className="space-y-3">
            {vivaQuestions.map((q, i) => (
              <Card key={i}>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="info">{q.difficulty}</Badge>
                  </div>
                  <p className="font-medium text-navy-900 dark:text-white mb-2">Q{i + 1}: {q.question}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{q.model_answer}</p>
                  {q.law_reference && <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">📖 {q.law_reference}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Notes / Case brief */}
        {(notes || caseBrief) && !isGenerating && (
          <Card>
            <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">{mode === 'notes' ? 'Study Notes' : 'Case Brief'}</h3></CardHeader>
            <CardContent>
              <div className="prose-legal prose-sm max-w-none text-slate-700 dark:text-slate-300">
                <ReactMarkdown>{notes || caseBrief || ''}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        <Disclaimer />
      </div>
    </DashboardShell>
  );
}
