import { Scale } from 'lucide-react';

export default function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 italic flex items-start gap-1.5 mt-3">
        <Scale className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        AI-generated content is for legal research, drafting assistance and educational purposes only.
        All drafts must be reviewed by a qualified advocate before legal use.
      </p>
    );
  }

  return (
    <div className="flex items-start gap-3 bg-gold-50 dark:bg-gold-950/30 border border-gold-300 dark:border-gold-800 rounded-lg p-4 text-sm">
      <Scale className="w-5 h-5 text-gold-700 dark:text-gold-400 flex-shrink-0 mt-0.5" />
      <p className="text-gold-900 dark:text-gold-200">
        <strong>Disclaimer:</strong> AI-generated content is for legal research, drafting assistance and
        educational purposes only. All drafts must be reviewed by a qualified advocate before legal use.
      </p>
    </div>
  );
}
