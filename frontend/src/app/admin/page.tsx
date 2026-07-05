'use client';

import { useState, useEffect } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { ShieldCheck, Users, FileText, MessageSquare, PenTool, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#16a34a', '#d4a017', '#334e68', '#7c3aed', '#dc2626'];

export default function AdminPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
    ]).then(([s, u]) => {
      setStats(s.data.data);
      setUsers(u.data.data);
    }).catch(() => toast.error('Failed to load admin data. Admin access required.'))
      .finally(() => setIsLoading(false));
  }, []);

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { status });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <DashboardShell>
        <Card><CardContent className="text-center py-16">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Admin access required.</p>
        </CardContent></Card>
      </DashboardShell>
    );
  }

  if (isLoading) {
    return <DashboardShell><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></div></DashboardShell>;
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gold-100 dark:bg-gold-950 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-gold-700 dark:text-gold-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Admin Panel</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Platform overview & user management</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Users', value: stats?.totals.users, icon: Users },
            { label: 'Cases', value: stats?.totals.cases, icon: FileText },
            { label: 'Documents', value: stats?.totals.documents, icon: FileText },
            { label: 'Drafts', value: stats?.totals.drafts, icon: PenTool },
            { label: 'Chat Messages', value: stats?.totals.chatMessages, icon: MessageSquare },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="text-center py-4">
                  <Icon className="w-5 h-5 text-primary-600 mx-auto mb-2" />
                  <p className="text-xl font-bold text-navy-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Users by role chart */}
          <Card>
            <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Users by Role</h3></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats?.usersByRole} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={70} label>
                    {stats?.usersByRole.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent signups */}
          <Card className="lg:col-span-2">
            <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Recent Signups</h3></CardHeader>
            <CardContent className="space-y-2">
              {stats?.recentSignups.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-navy-800 text-sm">
                  <div>
                    <p className="font-medium text-navy-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <Badge variant="info" className="capitalize">{u.role}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* User management */}
        <Card>
          <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">User Management</h3></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-200 dark:border-navy-800">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Joined</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-navy-800">
                    <td className="py-2.5 text-navy-900 dark:text-white font-medium">{u.name}</td>
                    <td className="py-2.5 text-slate-500">{u.email}</td>
                    <td className="py-2.5"><Badge className="capitalize">{u.role}</Badge></td>
                    <td className="py-2.5">
                      <Badge variant={u.status === 'active' ? 'success' : 'danger'} className="capitalize">{u.status}</Badge>
                    </td>
                    <td className="py-2.5 text-slate-500">{format(new Date(u.created_at), 'MMM d, yyyy')}</td>
                    <td className="py-2.5">
                      {u.status === 'active' ? (
                        <Button size="sm" variant="danger" onClick={() => updateUserStatus(u.id, 'suspended')}>Suspend</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => updateUserStatus(u.id, 'active')}>Activate</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
