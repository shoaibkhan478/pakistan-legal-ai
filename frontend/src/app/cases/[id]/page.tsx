'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { ArrowLeft, FileText, PenTool, Trash2, Loader2, Calendar, Gavel } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statuses = ['open', 'pending', 'closed', 'won', 'lost', 'archived'];

export default function CaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get(`/cases/${id}`).then(({ data }) => setCaseData(data.data)).finally(() => setIsLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    try {
      await api.put(`/cases/${id}`, { status });
      setCaseData((prev: any) => ({ ...prev, status }));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this case? This cannot be undone.')) return;
    try {
      await api.delete(`/cases/${id}`);
      toast.success('Case deleted');
      router.push('/cases');
    } catch {
      toast.error('Failed to delete case');
    }
  };

  if (isLoading) return <DashboardShell><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></div></DashboardShell>;
  if (!caseData) return <DashboardShell><p>Case not found.</p></DashboardShell>;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <button onClick={() => router.push('/cases')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-700">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{caseData.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{caseData.case_number} {caseData.court_name && `• ${caseData.court_name}`}</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Description</h3></CardHeader>
              <CardContent><p className="text-sm text-slate-600 dark:text-slate-400">{caseData.description || 'No description provided.'}</p></CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2"><FileText className="w-4 h-4" /> Documents ({caseData.documents?.length || 0})</h3></CardHeader>
              <CardContent>
                {caseData.documents?.length === 0 ? (
                  <p className="text-sm text-slate-400">No documents uploaded for this case yet.</p>
                ) : (
                  <div className="space-y-2">
                    {caseData.documents?.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-navy-800 text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{d.original_name}</span>
                        <Badge>{d.file_type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2"><PenTool className="w-4 h-4" /> Drafts ({caseData.drafts?.length || 0})</h3></CardHeader>
              <CardContent>
                {caseData.drafts?.length === 0 ? (
                  <p className="text-sm text-slate-400">No drafts generated for this case yet.</p>
                ) : (
                  <div className="space-y-2">
                    {caseData.drafts?.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-navy-800 text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{d.title}</span>
                        <Badge variant="gold">{d.draft_type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Case Status</h3></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium capitalize border transition-colors ${
                        caseData.status === s
                          ? 'bg-primary-700 text-white border-primary-700'
                          : 'border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-400 hover:border-primary-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Calendar className="w-4 h-4" /> Created {format(new Date(caseData.created_at), 'MMM d, yyyy')}
                </div>
                {caseData.opposing_party && (
                  <div><p className="text-xs text-slate-400">Opposing Party</p><p className="text-slate-700 dark:text-slate-300">{caseData.opposing_party}</p></div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
