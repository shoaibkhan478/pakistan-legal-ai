'use client';

import { Search } from 'lucide-react';

interface LiveSearchToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Checkbox that lets the user opt in to an extra live Google Search pass
 * for the latest case law before running a structured (FIR/notice/
 * judgment/plaint) analysis. Off by default — the local law library
 * (Constitution/PPC/CrPC + any ingested judgments) already grounds every
 * analysis quickly; this adds a second, slower AI call (can take 30-60+
 * seconds, occasionally longer) in exchange for possibly more current
 * results, so it's opt-in rather than always-on.
 */
export default function LiveSearchToggle({ checked, onChange }: LiveSearchToggleProps) {
  return (
    <label className="flex items-start gap-2.5 mb-4 p-3 rounded-lg border border-slate-200 dark:border-navy-700 cursor-pointer hover:border-primary-300 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-primary-600 flex-shrink-0"
      />
      <span className="text-sm text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5 font-medium text-navy-900 dark:text-white">
          <Search className="w-3.5 h-3.5" /> Include live case-law search
        </span>
        <br />
        Searches the web for the latest relevant judgments before analyzing — more current, but takes
        longer (up to ~30 seconds extra). This step now has a built-in time limit, so it will no longer
        cause the whole analysis to fail — worst case, it's skipped automatically and the analysis still completes.
      </span>
    </label>
  );
}
