'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Upload, FileText, CheckCircle2, Loader2, BookOpen, ArrowLeft, X,
} from 'lucide-react';

interface Subject { id: string; name: string }

interface Props { subjects: Subject[] }

const ACCEPTED = '.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function UploadClient({ subjects }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  }

  function pickFile(f: File) {
    setFile(f);
    if (!chapterName) setChapterName(f.name.replace(/\.[^.]+$/, ''));
  }

  function resetForm() {
    setSelectedSubjectId('');
    setChapterName('');
    setFile(null);
    setUploaded(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUpload() {
    if (!file || !selectedSubjectId || !chapterName.trim()) {
      toast.error('Select a subject, enter a chapter name, and choose a file');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', selectedSubjectId);
    formData.append('chapterName', chapterName.trim());

    try {
      const res = await fetch('/api/chapters/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Upload failed');
      } else {
        setUploaded(true);
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setUploading(false);
  }

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
              <span className="font-semibold text-gray-800">{chapterName}</span> is being processed in the background.
              It will be ready in 15–30 seconds.
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

          {/* Drop zone */}
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Chapter File</Label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
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
                accept={ACCEPTED}
                className="hidden"
                onChange={handleFileChange}
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
                  <p className="text-xs text-gray-400">PDF, DOCX, TXT, PNG, JPG — up to 50 MB</p>
                </div>
              )}
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
            size="lg"
            onClick={handleUpload}
            disabled={uploading || !file || !selectedSubjectId || !chapterName.trim()}
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading…</>
              : <><Upload className="h-4 w-4 mr-2" />Upload Chapter</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
