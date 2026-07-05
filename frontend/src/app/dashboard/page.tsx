'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, Badge } from '@/components/ui';
import { useAuthStore } from '@/lib/authStore';
import api from '@/lib/api';
import {
  MessageSquare, FileWarning, FileText, Gavel, PenTool, Briefcase,
  TrendingUp, Clock, ArrowRight, Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

const quickActions = [
  { href: '/chat', label: 'AI Legal Chat', icon: MessageSquare, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  { href: '/fir-analysis', label: 'Analyze FIR', icon: FileWarning, color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  { href: '/notice-analysis', label: 'Notice Analysis', icon: FileText, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  { href: '/judgment-analysis', label: 'Judgment Analysis', icon: Gavel, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' },
  { href: '/drafting', label: 'Generate Draft', icon: PenTool, color: 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400' },
  { href: '/cases', label: 'Manage Cases', icon: Briefcase, color: 'bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-navy-300' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);

  useEffect(() => {
    api.get('/users/dashboard-stats').then(({ data }) => setStats(data.data)).catch(() => {});
    api.get('/users/usage').then(({ data }) => setUsage(data.data)).catch(() => {});
  }, []);

  const tokensPercent = stats?.tokens_limit ? Math.min(100, (stats.tokens_used / stats.tokens_limit) * 100) : 0;

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Here's an overview of your legal AI workspace
            </p>
          </div>
          <Badge variant="gold" className="capitalize self-start sm:self-auto px-3 py-1">
            {stats?.plan || 'free'} plan
          </Badge>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Cases', value: stats?.total_cases || 0, icon: Briefcase },
            { label: 'Documents', value: stats?.total_documents || 0, icon: FileText },
            { label: 'Drafts Generated', value: stats?.total_drafts || 0, icon: PenTool },
            { label: 'Chat Messages', value: stats?.total_chats || 0, icon: MessageSquare },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-primary-50 dark:bg-primary-950 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-700 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-navy-900 dark:text-white">{s.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick actions */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-navy-900 dark:text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-500" /> Quick Actions
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Link key={a.href} href={a.href}>
                    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-full">
                      <CardContent className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-navy-900 dark:text-white text-sm">{a.label}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Usage chart */}
            {usage.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-navy-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-600" /> Feature Usage
                </h2>
                <Card>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={usage}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="feature" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="request_count" fill="#15803d" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Side panel: usage / tips */}
          <div className="space-y-6">
            <Card>
              <CardContent>
                <h3 className="font-semibold text-navy-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> Token Usage
                </h3>
                <div className="w-full bg-slate-100 dark:bg-navy-800 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-primary-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${tokensPercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(stats?.tokens_used || 0).toLocaleString()} / {(stats?.tokens_limit || 50000).toLocaleString()} tokens used
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary-700 to-primary-900 border-0 text-white">
              <CardContent>
                <h3 className="font-semibold mb-2">💡 Did you know?</h3>
                <p className="text-sm text-primary-100">
                  You can upload an FIR and get a complete bail possibility assessment with defence
                  suggestions in seconds using FIR Analysis.
                </p>
                <Link href="/fir-analysis" className="inline-flex items-center gap-1 text-sm font-medium mt-3 text-gold-300 hover:underline">
                  Try it now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
