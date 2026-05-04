'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Upload, FileText, CheckCircle2, Loader2, BookOpen, ArrowLeft, X, Info, Camera, GripVertical,
} from 'lucide-react';

interface Subject { id: string; name: string }
interface Props { subjects: Subject[] }

const FILE_ACCEPTED = '.pdf,.docx,.doc,.txt';
const SCREENSHOT_ACCEPTED = '.png,.jpg,.jpeg,.webp';

interface ScreenshotEntry {
  id: string;
  file: File;
  preview: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function UploadClient({ subjects }: Props) {
  // ── Shared state ────────────────────────────────────────────────
  const [uploadMode, setUploadMode] = useState<'file' | 'screenshots'>('file');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedSourceType, setUploadedSourceType] = useState<'file' | 'screenshots'>('file');

  // ── File-upload state ────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // ── Screenshot state ─────────────────────────────────────────────
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  const [screenshotDragOver, setScreenshotDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [reorderDragIdx, setReorderDragIdx] = useState<number | null>(null);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => { screenshots.forEach(s => URL.revokeObjectURL(s.preview)); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── File-upload handlers ─────────────────────────────────────────
  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  function pickFile(f: File) {
    setFile(f);
    if (!chapterName) setChapterName(f.name.replace(/\.[^.]+$/, ''));
  }

  // ── Screenshot handlers ──────────────────────────────────────────
  function addScreenshots(incoming: FileList | File[]) {
    const arr = Array.from(incoming).filter(f => f.type.startsWith('image/'));
    if (!arr.length) return;
    setScreenshots(prev => {
      const slots = 30 - prev.length;
      return [
        ...prev,
        ...arr.slice(0, slots).map(f => ({
          id: crypto.randomUUID(),
          file: f,
          preview: URL.createObjectURL(f),
        })),
      ];
    });
    // Auto-fill chapter name from first screenshot if blank
    if (!chapterName && arr[0]) setChapterName(arr[0].name.replace(/\.[^.]+$/, '').replace(/_\d+$/, ''));
  }

  function removeScreenshot(id: string) {
    setScreenshots(prev => {
      const entry = prev.find(x => x.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter(x => x.id !== id);
    });
  }

  function handleScreenshotFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setScreenshotDragOver(false);
    addScreenshots(e.dataTransfer.files);
  }

  // Drag-to-reorder thumbnails
  function handleReorderDragStart(idx: number) { setReorderDragIdx(idx); }
  function handleReorderDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (reorderDragIdx === null || reorderDragIdx === idx) return;
    setScreenshots(prev => {
      const arr = [...prev];
      const [item] = arr.splice(reorderDragIdx, 1);
      arr.splice(idx, 0, item);
      return arr;
    });
    setReorderDragIdx(idx);
  }
  function handleReorderDragEnd() { setReorderDragIdx(null); }

  // ── Reset ────────────────────────────────────────────────────────
  function resetForm() {
    setSelectedSubjectId('');
    setChapterName('');
    setFile(null);
    setUploaded(false);
    setUploadProgress(null);
    screenshots.forEach(s => URL.revokeObjectURL(s.preview));
    setScreenshots([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (screenshotInputRef.current) screenshotInputRef.current.value = '';
  }

  // ── Upload: file mode ────────────────────────────────────────────
  async function handleFileUpload() {
    if (!file || !selectedSubjectId || !chapterName.trim()) {
      toast.error('Select a subject, enter a chapter name, and choose a file');
      return;
    }
    setUploading(true);
    try {
      const urlRes = await fetch('/api/chapters/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubjectId, fileName: file.name }),
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) { toast.error(urlJson.error ?? 'Failed to prepare upload'); setUploading(false); return; }
      const { signedUrl, storagePath } = urlJson as { signedUrl: string; storagePath: string };

      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!putRes.ok) { toast.error('Failed to upload file. Please try again.'); setUploading(false); return; }

      const uploadRes = await fetch('/api/chapters/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath, fileName: file.name, fileSize: file.size,
          subjectId: selectedSubjectId, chapterName: chapterName.trim(),
        }),
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        toast.error(uploadJson.error ?? 'Upload failed');
      } else {
        setUploadedSourceType('file');
        setUploaded(true);
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setUploading(false);
  }

  // ── Upload: screenshots mode ─────────────────────────────────────
  async function handleScreenshotUpload() {
    if (!screenshots.length || !selectedSubjectId || !chapterName.trim()) {
      toast.error('Select a subject, enter a chapter name, and add screenshots');
      return;
    }
    setUploading(true);
    setUploadProgress(null);
    try {
      // 1. Get signed URLs for all screenshots at once
      const signedUrlRes = await fetch('/api/chapters/upload-screenshots/signed-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          files: screenshots.map((s, i) => ({ name: s.file.name, index: i })),
        }),
      });
      const urlJson = await signedUrlRes.json();
      if (!signedUrlRes.ok) { toast.error(urlJson.error ?? 'Failed to prepare upload'); setUploading(false); return; }
      const { urls } = urlJson as { urls: Array<{ signedUrl: string; storagePath: string }> };

      // 2. Upload each screenshot directly to Supabase Storage
      const storagePaths: string[] = [];
      for (let i = 0; i < screenshots.length; i++) {
        setUploadProgress({ current: i + 1, total: screenshots.length });
        const { signedUrl, storagePath } = urls[i];
        const putRes = await fetch(signedUrl, {
          method: 'PUT',
          body: screenshots[i].file,
          headers: { 'Content-Type': screenshots[i].file.type || 'image/jpeg' },
        });
        if (!putRes.ok) {
          toast.error(`Failed to upload page ${i + 1}. Please try again.`);
          setUploading(false);
          setUploadProgress(null);
          return;
        }
        storagePaths.push(storagePath);
      }

      // 3. Create chapter record and trigger background OCR
      setUploadProgress(null);
      const res = await fetch('/api/chapters/upload-screenshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          chapterName: chapterName.trim(),
          storagePaths,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Upload failed');
      } else {
        setUploadedSourceType('screenshots');
        setUploaded(true);
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setUploading(false);
    setUploadProgress(null);
  }

  // ── Success screen ───────────────────────────────────────────────
  if (uploaded) {
    return (
      <div className="max-w-lg mx-auto mt-10">
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-8 pt-8 pb-6 text-center">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Chapter Uploaded!</h2>
          </div>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-gray-600 text-sm">
              <span className="font-semibold text-gray-800">{chapterName}</span>
              {uploadedSourceType === 'screenshots'
                ? ' is being processed — OCR is reading your screenshots. Ready in 30–90 seconds.'
                : ' is being processed in the background. It will be ready in 15–30 seconds.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href={`/chapters?subject=${encodeURIComponent(subjects.find(s => s.id === selectedSubjectId)?.name ?? '')}`}>
                <Button className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <BookOpen className="h-4 w-4" />
                  View My Saved Chapters
                </Button>
              </Link>
              <Button variant="outline" onClick={resetForm} className="w-full sm:w-auto gap-2">
                <Upload className="h-4 w-4" />
                Upload Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-5 text-white shadow-md">
        <Link href="/chapters" className="text-blue-200 hover:text-white flex items-center gap-1 text-xs mb-2 transition-colors">
          <ArrowLeft className="h-3 w-3" /> My Saved Chapters
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Upload Chapter</h1>
            <p className="text-blue-100 text-xs mt-0.5">Add a chapter to your library for AI-powered study tools</p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-blue-100 px-5 py-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            Chapter Details
          </p>
        </div>
        <CardContent className="p-5 space-y-5">
          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Subject</Label>
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">
                No subjects yet. Create a subject first from the{' '}
                <Link href="/chapters" className="text-blue-600 underline">chapters</Link> page.
              </p>
            ) : (
              <Select
                onValueChange={(v: string | null) => setSelectedSubjectId(v ?? '')}
                value={selectedSubjectId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value
                        ? (subjects.find(s => s.id === value)?.name ?? value)
                        : <span className="text-muted-foreground">Select a subject</span>
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Chapter Name */}
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Chapter Name</Label>
            <Input
              placeholder="e.g. Chapter 3: Cells"
              value={chapterName}
              onChange={e => setChapterName(e.target.value)}
            />
          </div>

          {/* Upload mode tabs */}
          <div className="space-y-3">
            <Label className="text-gray-700 font-medium">Chapter Content</Label>

            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setUploadMode('file')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${
                  uploadMode === 'file'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <FileText className="h-4 w-4" />
                Upload File
              </button>
              <button
                onClick={() => setUploadMode('screenshots')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors border-l border-gray-200 ${
                  uploadMode === 'screenshots'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Camera className="h-4 w-4" />
                Upload Screenshots
              </button>
            </div>

            {/* ── File mode ── */}
            {uploadMode === 'file' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <Info className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Only upload documents you own or have permission to use.{' '}
                    <a
                      href="mailto:ravi.nagam.kiran@gmail.com?subject=Content%20Takedown%20Request"
                      className="underline text-amber-800 hover:text-amber-900"
                    >
                      Report infringing content
                    </a>.
                  </p>
                </div>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    file
                      ? 'border-emerald-300 bg-emerald-50'
                      : dragOver
                      ? 'border-blue-400 bg-blue-50 cursor-copy scale-[1.01]'
                      : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={FILE_ACCEPTED}
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
                  />
                  {file ? (
                    <div className="space-y-2">
                      <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto">
                        <FileText className="h-6 w-6 text-emerald-600" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{file.name}</p>
                      <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="text-xs text-red-400 hover:text-red-600 flex items-center gap-0.5 mx-auto transition-colors"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto">
                        <Upload className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="font-semibold text-gray-700 text-sm">Drop file here or click to browse</p>
                      <p className="text-xs text-gray-400">PDF, DOCX, TXT — up to 50 MB</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Screenshots mode ── */}
            {uploadMode === 'screenshots' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700">
                    Upload screenshots of your chapter pages in order. AI will read the text from each image.
                    Max 30 pages.
                  </p>
                </div>

                {screenshots.length === 0 ? (
                  // Drop zone (no screenshots yet)
                  <div
                    onDragOver={e => { e.preventDefault(); setScreenshotDragOver(true); }}
                    onDragLeave={() => setScreenshotDragOver(false)}
                    onDrop={handleScreenshotFileDrop}
                    onClick={() => screenshotInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                      screenshotDragOver
                        ? 'border-blue-400 bg-blue-50 scale-[1.01]'
                        : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
                      <Camera className="h-6 w-6 text-blue-500" />
                    </div>
                    <p className="font-semibold text-gray-700 text-sm">Drop screenshots here or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — select multiple files</p>
                  </div>
                ) : (
                  // Thumbnail grid
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 font-medium">
                        {screenshots.length} page{screenshots.length !== 1 ? 's' : ''} selected
                        {screenshots.length >= 30 && <span className="text-amber-600 ml-1">(max reached)</span>}
                      </p>
                      {screenshots.length < 30 && (
                        <button
                          onClick={() => screenshotInputRef.current?.click()}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          + Add more
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {screenshots.map((s, i) => (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={() => handleReorderDragStart(i)}
                          onDragOver={e => handleReorderDragOver(e, i)}
                          onDragEnd={handleReorderDragEnd}
                          className={`relative rounded-lg overflow-hidden border-2 aspect-[3/4] cursor-grab active:cursor-grabbing select-none ${
                            reorderDragIdx === i ? 'opacity-40 border-blue-400' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.preview}
                            alt={`Page ${i + 1}`}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                          {/* Page label */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 font-medium">
                            {i + 1}
                          </div>
                          {/* Drag handle hint */}
                          <div className="absolute top-1 left-1 text-white/70">
                            <GripVertical className="h-3 w-3" />
                          </div>
                          {/* Remove button */}
                          <button
                            onClick={() => removeScreenshot(s.id)}
                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center shadow transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-400 text-center">Drag thumbnails to reorder pages</p>
                  </div>
                )}

                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept={SCREENSHOT_ACCEPTED}
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files) addScreenshots(e.target.files); e.target.value = ''; }}
                />
              </div>
            )}
          </div>

          {/* Upload button */}
          {uploadMode === 'file' ? (
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
              size="lg"
              onClick={handleFileUpload}
              disabled={uploading || !file || !selectedSubjectId || !chapterName.trim()}
            >
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading…</>
                : <><Upload className="h-4 w-4 mr-2" />Upload Chapter</>}
            </Button>
          ) : (
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
              size="lg"
              onClick={handleScreenshotUpload}
              disabled={uploading || screenshots.length === 0 || !selectedSubjectId || !chapterName.trim()}
            >
              {uploading ? (
                uploadProgress
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading page {uploadProgress.current} of {uploadProgress.total}…</>
                  : <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
              ) : (
                <><Camera className="h-4 w-4 mr-2" />Upload {screenshots.length > 0 ? `${screenshots.length} Page${screenshots.length !== 1 ? 's' : ''}` : 'Screenshots'}</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
