'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, Badge, Input } from '@/components/ui';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { Briefcase, Plus, X, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors: Record<string, any> = {
  open: 'success', closed: 'default', pending: 'warning', archived: 'default', won: 'success', lost: 'danger',
};

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewCase, setShowNewCase] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', caseNumber: '', courtName: '' });
  const [isCreating, setIsCreating] = useState(false);

  const loadCases = () => {
    setIsLoading(true);
    api.get('/cases').then(({ data }) => setCases(data.data)).finally(() => setIsLoading(false));
  };

  useEffect(() => { loadCases(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.post('/cases', formData);
      toast.success('Case created!');
      setShowNewCase(false);
      setFormData({ title: '', description: '', caseNumber: '', courtName: '' });
      loadCases();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create case.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Case Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track and organize all your legal cases</p>
          </div>
          <Button onClick={() => setShowNewCase(true)}>
            <Plus className="w-4 h-4" /> New Case
          </Button>
        </div>

        {showNewCase && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-navy-900 dark:text-white">Create New Case</h3>
                <button onClick={() => setShowNewCase(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input label="Case Title" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Ali vs. Khan - Property Dispute" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Case Number" value={formData.caseNumber} onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })} placeholder="C.S No. 123/2026" />
                  <Input label="Court Name" value={formData.courtName} onChange={(e) => setFormData({ ...formData, courtName: e.target.value })} placeholder="Civil Court Lahore" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <Button type="submit" isLoading={isCreating}>Create Case</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></div>
        ) : cases.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Briefcase className="w-10 h-10 text-slate-300 dark:text-navy-700 mb-3" />
            <p className="text-sm text-slate-400 mb-4">No cases yet. Create your first case to get started.</p>
            <Button onClick={() => setShowNewCase(true)}><Plus className="w-4 h-4" /> New Case</Button>
          </CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <Card className="h-full hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                  <CardContent>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-navy-900 dark:text-white text-sm leading-tight">{c.title}</h3>
                      <Badge variant={statusColors[c.status] || 'default'}>{c.status}</Badge>
                    </div>
                    {c.case_number && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{c.case_number}</p>}
                    {c.court_name && <p className="text-xs text-slate-500 dark:text-slate-400">{c.court_name}</p>}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3">
                      <Calendar className="w-3.5 h-3.5" /> {format(new Date(c.created_at), 'MMM d, yyyy')}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
