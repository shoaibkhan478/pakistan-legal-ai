'use client';

import { useState, useEffect } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Input, Badge } from '@/components/ui';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { User as UserIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, fetchUser } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '', phone: '', barCouncilNumber: '', bio: '', languagePreference: 'english',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.get('/users/profile').then(({ data }) => {
      const p = data.data;
      setFormData({
        name: p.name || '',
        phone: p.phone || '',
        barCouncilNumber: p.bar_council_number || '',
        bio: p.bio || '',
        languagePreference: p.language_preference || 'english',
      });
    }).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/users/profile', formData);
      await fetchUser();
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Profile</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your personal information</p>
        </div>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-700 text-white flex items-center justify-center text-2xl font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-navy-900 dark:text-white">{user?.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
              <Badge variant="gold" className="mt-1 capitalize">{user?.role}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2"><UserIcon className="w-4 h-4" /> Personal Information</h3></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Full Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <Input label="Phone Number" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+92 3XX XXXXXXX" />
              {(user?.role === 'advocate') && (
                <Input label="Bar Council Number" value={formData.barCouncilNumber} onChange={(e) => setFormData({ ...formData, barCouncilNumber: e.target.value })} />
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Preferred Language</label>
                <select
                  value={formData.languagePreference}
                  onChange={(e) => setFormData({ ...formData, languagePreference: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="english">English</option>
                  <option value="urdu">اردو (Urdu)</option>
                  <option value="roman_urdu">Roman Urdu</option>
                  <option value="bilingual">Bilingual</option>
                </select>
              </div>
              <Button type="submit" isLoading={isSaving}><Save className="w-4 h-4" /> Save Changes</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
