'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { Card, CardContent, Badge } from '@/components/ui';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { Upload as UploadIcon, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const documentTypes = [
  { value: 'fir', label: 'FIR (First Information Report)', route: '/fir-analysis' },
  { value: 'notice', label: 'Legal Notice', route: '/notice-analysis' },
  { value: 'judgment', label: 'Court Judgment / Order', route: '/judgment-analysis' },
  { value: 'plaint', label: 'Plaint / Written Statement', route: '/case-analysis' },
  { value: 'objection', label: 'Written Objection', route: '/case-analysis' },
  { value: 'contract', label: 'Contract / Agreement', route: '/case-analysis' },
  { value: 'petition', label: 'Petition', route: '/case-analysis' },
  { value: 'affidavit', label: 'Affidavit', route: '/case-analysis' },
  { value: 'other', label: 'Other Document', route: '/case-analysis' },
];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('other');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadedDoc(null);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);
    formData.append('description', description);

    try {
      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedDoc(data.data.document);
      toast.success('Document uploaded and processed!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const goToAnalysis = () => {
    const docType = documentTypes.find((d) => d.value === documentType);
    router.push(`${docType?.route}?documentId=${uploadedDoc.id}`);
  };

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Upload Documents</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload FIRs, notices, judgments, or any legal document for AI analysis. OCR is applied to scanned files automatically.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-5">
            {/* Document type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {documentTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' : 'border-slate-300 dark:border-navy-700'
              )}
            >
              {!file ? (
                <>
                  <UploadIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Drag & drop your file here, or
                  </p>
                  <label className="inline-block">
                    <span className="text-primary-700 dark:text-primary-400 font-medium text-sm cursor-pointer hover:underline">
                      browse to upload
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.tiff,.doc,.docx"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <p className="text-xs text-slate-400 mt-3">PDF, JPG, PNG, TIFF, DOC, DOCX up to 50MB</p>
                </>
              ) : (
                <div className="flex items-center justify-between bg-white dark:bg-navy-800 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-navy-900 dark:text-white truncate max-w-xs">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief description of this document..."
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <Button onClick={handleUpload} disabled={!file} isLoading={isUploading} className="w-full">
              {isUploading ? 'Uploading & Processing...' : 'Upload Document'}
            </Button>
          </CardContent>
        </Card>

        {uploadedDoc && (
          <Card className="border-primary-300 dark:border-primary-800">
            <CardContent>
              <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 mb-3">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold">Document processed successfully</p>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-4">
                <p><strong>File:</strong> {uploadedDoc.original_name}</p>
                <p><strong>Type:</strong> <Badge>{uploadedDoc.file_type}</Badge></p>
                <p><strong>OCR Status:</strong> {uploadedDoc.is_ocr_processed ? `Text extracted (${uploadedDoc.ocr_confidence}% confidence)` : 'Pending'}</p>
              </div>
              <Button onClick={goToAnalysis} className="w-full">
                Proceed to Analysis →
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
