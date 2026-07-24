'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui';
import Button from '@/components/ui/Button';
import Disclaimer from '@/components/legal/Disclaimer';
import SeniorAdvocateToggle from '@/components/legal/SeniorAdvocateToggle';
import DeepAnalysisResult, { DeepAnalysisData } from '@/components/legal/DeepAnalysisResult';
import api from '@/lib/api';
import { Send, Bot, User, Loader2, Languages, Plus, History, Search, X, Paperclip, Gavel } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  message: string;
  deepAnalysis?: DeepAnalysisData;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

const languages = [
  { value: 'english', label: 'English' },
  { value: 'urdu', label: 'اردو' },
  { value: 'roman_urdu', label: 'Roman Urdu' },
];

const suggestedPrompts = [
  'What is the bail procedure under Section 497 CrPC?',
  'Explain the grounds for divorce under Pakistani family law',
  'What are my rights if I am arrested?',
  'How do I file a civil suit for recovery of money?',
];

// ---- Local chat history (saved in this browser only) ----
const STORAGE_KEY = 'legalai_chat_sessions';

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // localStorage full or unavailable — chat still works, just won't persist
  }
}

function makeTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New Chat';
  const text = firstUser.message.trim();
  return text.length > 45 ? text.slice(0, 45) + '…' : text;
}

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'abhi';
  if (mins < 60) return `${mins}m pehle`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h pehle`;
  const days = Math.floor(hrs / 24);
  return `${days}d pehle`;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('english');
  const [deepMode, setDeepMode] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // On first load: restore saved sessions, and start a fresh session id
  useEffect(() => {
    setSessions(loadSessions());
    setSessionId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist the current conversation to local history whenever it changes
  useEffect(() => {
    if (!sessionId || messages.length === 0) return;
    setSessions((prev) => {
      const existingIndex = prev.findIndex((s) => s.id === sessionId);
      const updated: ChatSession = {
        id: sessionId,
        title: makeTitle(messages),
        updatedAt: Date.now(),
        messages,
      };
      const next =
        existingIndex >= 0
          ? [...prev.slice(0, existingIndex), updated, ...prev.slice(existingIndex + 1)]
          : [updated, ...prev];
      saveSessions(next);
      return next;
    });
  }, [messages, sessionId]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', message: messageText };
    const historyToSend = [...messages, userMsg];
    setMessages(historyToSend);
    setInput('');
    setIsLoading(true);

    try {
      // Send the FULL conversation so far, not just the latest message —
      // otherwise the AI has no memory of what was already discussed.
      const { data } = await api.post('/chat/message', {
        messages: historyToSend,
        language,
        deepMode,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', message: data.data.content, deepAnalysis: data.data.deepAnalysis },
      ]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to get response.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachFile = async (file: File | null | undefined) => {
    if (!file) return;
    setIsUploadingFile(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', 'other');

    try {
      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const doc = data.data.document;
      const { data: textRes } = await api.get(`/documents/${doc.id}/text`);
      const fullText: string = textRes.data.text || '';

      if (!fullText.trim()) {
        toast.error('No readable text found in this file. Try a clearer scan or paste the text manually.');
        return;
      }

      // Prefill the composer with the extracted text wrapped in a clear
      // instruction, so the user just has to add their question (or send
      // as-is) and the AI analyzes the actual uploaded document.
      setInput(
        `Yeh document (${file.name}) attach kiya hai, isay analyze karke bataen:\n\n${fullText}`
      );
      toast.success('Document read successfully — add your question and send.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const newChat = () => {
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setShowHistory(false);
  };

  const openSession = (s: ChatSession) => {
    setMessages(s.messages);
    setSessionId(s.id);
    setShowHistory(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
    if (id === sessionId) newChat();
  };

  // Search: matches session title or any message text inside it
  const filteredSessions = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.message.toLowerCase().includes(q))
    );
  }, [sessions, historyQuery]);

  return (
    <DashboardShell>
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">AI Legal Chat</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {deepMode ? 'Senior Advocate Mode: deep issue-by-issue analysis with citation verification' : 'Ask legal questions in English, Urdu, or Roman Urdu'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-lg px-1 py-1">
              <Languages className="w-4 h-4 text-slate-400 ml-1.5" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-sm bg-transparent outline-none pr-2 py-1 text-slate-700 dark:text-slate-300"
              >
                {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
              <History className="w-4 h-4" /> History
            </Button>
            <Button variant="outline" size="sm" onClick={newChat}>
              <Plus className="w-4 h-4" /> New Chat
            </Button>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden relative">
          {/* History panel */}
          {showHistory && (
            <div className="absolute inset-0 z-10 bg-white dark:bg-navy-900 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-navy-800">
                <h3 className="font-semibold text-navy-900 dark:text-white">Chat History</h3>
                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b border-slate-200 dark:border-navy-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder="Search past chats..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {filteredSessions.length === 0 && (
                  <p className="text-sm text-slate-400 text-center mt-10">
                    {historyQuery ? 'Koi match nahi mila.' : 'Abhi tak koi saved chat nahi hai.'}
                  </p>
                )}
                {filteredSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openSession(s)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg mb-1 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors flex items-start justify-between gap-2 group',
                      s.id === sessionId && 'bg-primary-50 dark:bg-primary-950/30'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy-900 dark:text-white truncate">{s.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{timeAgo(s.updatedAt)} &middot; {s.messages.length} messages</p>
                    </div>
                    <span
                      onClick={(e) => deleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 flex-shrink-0 px-2 py-1"
                    >
                      Delete
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-950 rounded-2xl flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-primary-700 dark:text-primary-400" />
                </div>
                <h3 className="font-semibold text-navy-900 dark:text-white mb-1">Ask me anything about Pakistani law</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                  I can help with FIR procedures, bail laws, family law, contracts, and more.
                </p>
                <div className="grid sm:grid-cols-2 gap-2 max-w-lg w-full">
                  {suggestedPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="text-left text-xs p-3 rounded-lg border border-slate-200 dark:border-navy-800 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  m.role === 'user' ? 'bg-navy-800 text-white' : m.deepAnalysis ? 'bg-amber-600 text-white' : 'bg-primary-700 text-white'
                )}>
                  {m.role === 'user' ? <User className="w-4 h-4" /> : m.deepAnalysis ? <Gavel className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                {m.deepAnalysis ? (
                  <div className="max-w-[92%] w-full rounded-2xl rounded-tl-sm border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/10 p-4">
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3">
                      <Gavel className="w-3.5 h-3.5" /> Senior Advocate Mode — full case analysis
                    </p>
                    <DeepAnalysisResult data={m.deepAnalysis} />
                  </div>
                ) : (
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                    m.role === 'user'
                      ? 'bg-primary-700 text-white rounded-tr-sm'
                      : 'bg-slate-100 dark:bg-navy-800 text-slate-800 dark:text-slate-200 rounded-tl-sm',
                    language === 'urdu' && 'urdu-text'
                  )}>
                    <div className="prose-legal prose-sm max-w-none">
                      <ReactMarkdown>{m.message}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className={cn('w-8 h-8 rounded-full text-white flex items-center justify-center flex-shrink-0', deepMode ? 'bg-amber-600' : 'bg-primary-700')}>
                  {deepMode ? <Gavel className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className="bg-slate-100 dark:bg-navy-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  {deepMode && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Building the full case analysis — issue-spotting, arguing both sides, verifying citations...
                    </span>
                  )}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 dark:border-navy-800 p-4">
            <SeniorAdvocateToggle checked={deepMode} onChange={setDeepMode} />
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex items-end gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.doc,.docx"
                className="hidden"
                onChange={(e) => handleAttachFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-[46px] px-3"
                isLoading={isUploadingFile}
                onClick={() => fileInputRef.current?.click()}
                title="Attach FIR, notice, judgment, or any document (PDF, photo, or Word file)"
              >
                {!isUploadingFile && <Paperclip className="w-4 h-4" />}
              </Button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={deepMode ? 'Describe the case facts for a full senior-advocate analysis...' : 'Type your legal question...'}
                rows={1}
                className={cn(
                  'flex-1 resize-none px-4 py-3 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900',
                  'text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500',
                  language === 'urdu' && 'urdu-text'
                )}
              />
              <Button type="submit" disabled={!input.trim()} isLoading={isLoading} className="h-[46px] px-4">
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <Disclaimer compact />
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
