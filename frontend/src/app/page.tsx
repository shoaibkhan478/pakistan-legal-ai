import Link from 'next/link';
import {
  Scale, MessageSquare, FileSearch, FileWarning, Gavel, PenTool,
  GraduationCap, ShieldCheck, Languages, ArrowRight, CheckCircle2
} from 'lucide-react';

const features = [
  { icon: MessageSquare, title: 'AI Legal Chat', desc: 'Get instant legal guidance in English, Urdu, or Roman Urdu with full conversation context.' },
  { icon: FileWarning, title: 'FIR Analysis', desc: 'Upload an FIR to extract sections, allegations, bail possibility, and defence strategy.' },
  { icon: FileSearch, title: 'Document Analysis', desc: 'Analyze notices, plaints, objections and judgments with structured AI insights.' },
  { icon: Gavel, title: 'Judgment Analysis', desc: 'Extract facts, issues, findings, and generate strong appeal grounds.' },
  { icon: PenTool, title: 'Drafting Assistant', desc: 'Generate bail applications, suits, notices, petitions, affidavits, and more.' },
  { icon: GraduationCap, title: 'Law Student Mode', desc: 'Generate MCQs, viva questions, case briefs, and exam-ready notes.' },
];

const stats = [
  { value: '9+', label: 'AI Legal Modules' },
  { value: '3', label: 'Languages Supported' },
  { value: '24/7', label: 'Available Assistance' },
  { value: '100%', label: 'Pakistan Law Focused' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-navy-950">
      {/* Nav */}
      <header className="border-b border-slate-200 dark:border-navy-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary-700 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <p className="font-bold text-navy-900 dark:text-white leading-tight">Pakistan Legal AI</p>
              <p className="text-xs text-slate-500">Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary-700 px-4 py-2">
              Login
            </Link>
            <Link href="/register" className="text-sm font-medium bg-primary-700 hover:bg-primary-800 text-white px-5 py-2.5 rounded-lg transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-400 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <Languages className="w-4 h-4" /> English • Urdu • Roman Urdu Support
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-navy-900 dark:text-white leading-tight mb-6">
          Your AI-Powered<br />
          <span className="text-primary-700 dark:text-primary-400">Legal Assistant</span> for Pakistan
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
          Analyze FIRs, legal notices, and judgments. Generate professional drafts. Conduct legal research.
          Built for advocates, law students, and citizens across Pakistan.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white px-7 py-3.5 rounded-lg font-medium transition-colors shadow-lg shadow-primary-700/20">
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 border-2 border-slate-300 dark:border-navy-700 text-slate-700 dark:text-slate-300 px-7 py-3.5 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors">
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-3xl mx-auto">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-primary-700 dark:text-primary-400">{s.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 dark:bg-navy-900/50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-navy-900 dark:text-white mb-3">Comprehensive Legal AI Toolkit</h2>
            <p className="text-slate-600 dark:text-slate-400">Everything advocates and law students need, powered by AI</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-800 p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-950 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-700 dark:text-primary-400" />
                  </div>
                  <h3 className="font-semibold text-navy-900 dark:text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-navy-900 dark:bg-navy-900 rounded-2xl p-10 text-center">
          <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Secure, Encrypted, Audit-Logged</h2>
          <p className="text-navy-300 max-w-xl mx-auto mb-6">
            Your documents are encrypted, access is role-based, and every action is logged for accountability and compliance.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-navy-300">
            {['JWT Authentication', 'Password Hashing', 'Role Based Access', 'Audit Logs', 'Document Encryption'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary-400" /> {t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer footer */}
      <footer className="border-t border-slate-200 dark:border-navy-800 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            ⚖️ AI-generated content is for legal research, drafting assistance and educational purposes only.
            All drafts must be reviewed by a qualified advocate before legal use.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-600 mt-3">© 2026 Pakistan Legal AI Agent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
