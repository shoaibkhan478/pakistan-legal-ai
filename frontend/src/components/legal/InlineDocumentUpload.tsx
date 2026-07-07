'use client';

import { useRef, useState } from 'react';
import api from '@/lib/api';
import { UploadCloud, Loader2, FileText, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface InlineDocumentUploadProps {
  /** documentType saved on the backend record, e.g. 'fir' | 'notice' | 'judgment' | 'plaint' */
  documentType: string;
  /** called with the full extracted text once upload + text extraction finishes */
  onExtracted: (text: string) => void;
  /** short label shown above the dropzone, e.g. "Upload FIR (PDF, image, or Word file)" */
  label?: string;
}

/**
 * Small drag-and-drop / click-to-browse PDF (or scanned image / Word doc)
 * uploader meant to sit directly on top of an analysis page's textarea.
 *
 * Reuses the existing POST /documents/upload endpoint (multer + pdf-parse +
 * OCR fallback already implemented server-side) and then fetches the full
 * extracted text via GET /documents/:id/text, handing it back to the parent
 * page so it can prefill the textarea — no separate "Upload Documents" page
 * detour required.
 */
export default function InlineDocumentUpload({ documentType, onExtracted, label }: InlineDocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    try {
      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const doc = data.data.document;

      // Upload response only includes a short preview; pull the full text.
      const { data: textRes } = await api.get(`/documents/${doc.id}/text`);
      const fullText: string = textRes.data.text || '';

      if (!fullText.trim()) {
        toast.error('No readable text found in this file. Try a clearer scan or paste the text manually.');
      } else {
        onExtracted(fullText);
        setUploadedName(file.name);
        toast.success('Document uploaded — text loaded below. You can edit it before analyzing.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChosen = (file: File | null | undefined) => {
    if (!file) return;
    processFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileChosen(e.dataTransfer.files?.[0]);
      }}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={`mb-4 flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors ${
        isDragging
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
          : 'border-slate-300 dark:border-navy-700 hover:border-primary-400'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.tiff,.doc,.docx"
        className="hidden"
        onChange={(e) => handleFileChosen(e.target.files?.[0])}
      />

      {isUploading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-primary-600 flex-shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Reading document…</p>
        </>
      ) : uploadedName ? (
        <>
          <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1">
            <span className="font-medium text-navy-900 dark:text-white">{uploadedName}</span> uploaded — text loaded below
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setUploadedName(null); }}
            className="text-slate-400 hover:text-red-500 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <UploadCloud className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {label || 'Upload PDF, scanned image, or Word file'}{' '}
            <span className="text-primary-700 dark:text-primary-400 font-medium">— click or drag & drop</span>
          </p>
        </>
      )}
    </div>
  );
}
