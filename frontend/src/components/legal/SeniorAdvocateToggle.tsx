'use client';

import { Gavel } from 'lucide-react';

interface SeniorAdvocateToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Checkbox that lets the user opt into "Senior Advocate Mode" for chat:
 * instead of one fast single-pass answer, the message runs through the
 * full multi-step reasoning chain (issue-spotting -> research + argue
 * both sides -> rebuttal simulation -> strategy synthesis -> independent
 * citation verification) already used for FIR/draft deep analysis.
 *
 * Off by default — this is meaningfully slower (several sequential/
 * parallel AI calls instead of one) and is meant for when the user is
 * actually working through a real case, not for quick factual questions.
 */
export default function SeniorAdvocateToggle({ checked, onChange }: SeniorAdvocateToggleProps) {
  return (
    <label
      className={`flex items-start gap-2.5 mb-4 p-3 rounded-lg border cursor-pointer transition-colors ${
        checked
          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700'
          : 'border-slate-200 dark:border-navy-700 hover:border-amber-300'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-amber-600 flex-shrink-0"
      />
      <span className="text-sm text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5 font-medium text-navy-900 dark:text-white">
          <Gavel className="w-3.5 h-3.5 text-amber-600" /> Senior Advocate Mode
        </span>
        <br />
        Issue-spot karta hai, dono taraf ke arguments banata hai, opposing counsel ka rebuttal simulate
        karta hai, aur har citation ko independently verify karta hai — jaisa ek senior advocate case
        prepare karta hai. Zyada thorough, lekin dheema (~1-2 minute per message).
      </span>
    </label>
  );
}
