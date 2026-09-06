/**
 * frontend/src/components/common/DownloadMenu.tsx
 *
 * ONE reusable "Download" control that offers both PDF and Word export of
 * any AI-generated text — drop this into any results page instead of each
 * page wiring up its own ad-hoc download button. Both formats use the same
 * underlying line-classification rules (docxExport.ts / pdfExport.ts), so
 * a document looks the same whichever format the user picks.
 *
 * USAGE — anywhere a page currently shows AI-generated text and wants a
 * download option (FIR analysis, notice/judgment analysis, drafts,
 * courtroom scripts, translations, deep-mode chat answers, research
 * output, case intake results):
 *
 *   import DownloadMenu from '@/components/common/DownloadMenu';
 *   ...
 *   <DownloadMenu content={someGeneratedText} filename="Bail_Application_12345" />
 *
 * Both export functions are dynamically imported inside this component
 * (same pattern the FIR analysis page already used for docxExport), so
 * pdfmake/docx never end up in the server-rendered bundle.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { FileDown, ChevronDown, FileText, File } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface DownloadMenuProps {
  /** The document body to export — plain text / lightly-markdown'd, same shape used everywhere else in the app. */
  content: string;
  /** Filename WITHOUT extension — each format appends its own (.pdf / .docx). */
  filename: string;
  /** Optional: shrinks to icon-only trigger for tight spaces (e.g. inline in a chat message). */
  compact?: boolean;
  /** Optional: disables the control (e.g. while content is still streaming in). */
  disabled?: boolean;
}

export default function DownloadMenu({ content, filename, compact = false, disabled = false }: DownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click — standard dropdown behaviour, matches other
  // menus in the app rather than requiring an explicit close button.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!content?.trim()) {
      toast.error('Nothing to download yet.');
      return;
    }
    setDownloading(format);
    setOpen(false);
    try {
      if (format === 'pdf') {
        const { downloadTextAsPdf } = await import('@/lib/pdfExport');
        await downloadTextAsPdf(content, filename, { title: filename });
        toast.success('PDF downloaded');
      } else {
        const { downloadDraftAsWord } = await import('@/lib/docxExport');
        await downloadDraftAsWord(content, filename);
        toast.success('Word document downloaded');
      }
    } catch (err) {
      toast.error(`Could not generate ${format === 'pdf' ? 'PDF' : 'Word document'}.`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        isLoading={downloading !== null}
        onClick={() => setOpen((o) => !o)}
      >
        <FileDown className="w-4 h-4" />
        {!compact && 'Download'}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 shadow-lg overflow-hidden">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
            onClick={() => handleDownload('pdf')}
          >
            <FileText className="w-4 h-4 text-red-600" /> Download PDF
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors border-t border-slate-100 dark:border-navy-800"
            onClick={() => handleDownload('docx')}
          >
            <File className="w-4 h-4 text-blue-600" /> Download Word
          </button>
        </div>
      )}
    </div>
  );
}
