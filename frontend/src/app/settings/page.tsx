'use client';

import { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, Input } from '@/components/ui';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { useThemeStore } from '@/lib/themeStore';
import { Lock, Sun, Moon, Globe, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { theme, setTheme, language, setLanguage } = useThemeStore();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('New passwords do not match.');
    }
    setIsSaving(true);
    try {
      await api.put('/users/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password updated successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account preferences</p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white">Appearance</h3></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={cn('flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm', theme === 'light' ? 'border-primary-600 bg-primary-50' : 'border-slate-200 dark:border-navy-800')}
                >
                  <Sun className="w-4 h-4" /> Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn('flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm', theme === 'dark' ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40' : 'border-slate-200 dark:border-navy-800')}
                >
                  <Moon className="w-4 h-4" /> Dark
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Interface Language</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setLanguage('english')}
                  className={cn('flex-1 p-3 rounded-lg border text-sm', language === 'english' ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40' : 'border-slate-200 dark:border-navy-800')}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('urdu')}
                  className={cn('flex-1 p-3 rounded-lg border text-sm', language === 'urdu' ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40' : 'border-slate-200 dark:border-navy-800')}
                >
                  اردو
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</h3></CardHeader>
          <CardContent className="space-y-3">
            {['Case updates', 'Document processing complete', 'Draft generation complete', 'System announcements'].map((n) => (
              <label key={n} className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                {n}
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary-700" />
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader><h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h3></CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input label="Current Password" type="password" required value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
              <Input label="New Password" type="password" required value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
              <Input label="Confirm New Password" type="password" required value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
              <Button type="submit" isLoading={isSaving}>Update Password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
