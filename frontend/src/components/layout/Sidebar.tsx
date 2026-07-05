'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/authStore';
import {
  LayoutDashboard, MessageSquare, Upload, FileSearch, FileWarning,
  FileText, Gavel, PenTool, BookOpen, Briefcase, GraduationCap,
  User, Settings, ShieldCheck, Scale, X
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'AI Legal Chat', icon: MessageSquare },
  { href: '/upload', label: 'Upload Documents', icon: Upload },
  { href: '/case-analysis', label: 'Case Analysis', icon: FileSearch },
  { href: '/fir-analysis', label: 'FIR Analysis', icon: FileWarning },
  { href: '/notice-analysis', label: 'Legal Notice Analysis', icon: FileText },
  { href: '/judgment-analysis', label: 'Judgment Analysis', icon: Gavel },
  { href: '/drafting', label: 'Drafting Assistant', icon: PenTool },
  { href: '/research', label: 'Legal Research', icon: BookOpen },
  { href: '/cases', label: 'Case Management', icon: Briefcase },
  { href: '/student-mode', label: 'Law Student Mode', icon: GraduationCap },
];

const bottomItems = [
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed lg:sticky top-0 left-0 h-screen w-72 bg-navy-950 text-white z-40 flex flex-col',
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Scale className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">Pakistan Legal AI</p>
              <p className="text-xs text-navy-400">Legal Assistant</p>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-navy-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-700 text-white'
                    : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                )}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {user?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-4 border-t border-navy-800 pt-4',
                pathname === '/admin'
                  ? 'bg-gold-700 text-white'
                  : 'text-gold-400 hover:bg-navy-800'
              )}
            >
              <ShieldCheck className="w-4.5 h-4.5" />
              Admin Panel
            </Link>
          )}
        </nav>

        {/* Bottom items */}
        <div className="p-3 border-t border-navy-800 space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-primary-700 text-white' : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                )}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
