'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  CalendarCheck, Plus, Loader2, ArrowRight,
  BookOpen, Clock, Minus, Trash2,
} from 'lucide-react';

interface Chapter {
  id: string;
  name: string;
  subject_name: string;
  subject_id: string;
  upload_status: string;
}

interface Test {
  id: string;
  name: string;
  test_date: string;
  chapter_ids: string[];
  plan_start_date?: string | null;
}

interface Props {
  tests: Test[];
  chapters: Chapter[];
}

function daysLabel(date: string) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return 'Past';
  if (days === 0) return 'Today!';
  return `${days} day${days !== 1 ? 's' : ''} left from today`;
}

const MIN_MINUTES = 15;
const MAX_MINUTES = 120;
const DEFAULT_MINUTES = 30;

export function TestPlannerClient({ tests, chapters }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [planStartDate, setPlanStartDate] = useState('');
  // subject_id → daily_minutes
  const [subjectMinutes, setSubjectMinutes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  // Group chapters by subject
  const bySubject = useMemo(() =>
    chapters.reduce<Record<string, Chapter[]>>((acc, c) => {
      if (!acc[c.subject_name]) acc[c.subject_name] = [];
      acc[c.subject_name].push(c);
      return acc;
    }, {}),
    [chapters]
  );

  // Subjects that have at least one selected chapter
  const activeSubjects = useMemo(() => {
    const seen = new Set<string>();
    return chapters.filter(c => {
      if (!selectedChapters.includes(c.id)) return false;
      if (seen.has(c.subject_id)) return false;
      seen.add(c.subject_id);
      return true;
    });
  }, [selectedChapters, chapters]);

  const totalDailyMinutes = activeSubjects.reduce(
    (sum, s) => sum + (subjectMinutes[s.subject_id] ?? DEFAULT_MINUTES),
    0
  );

  function toggleChapter(id: string) {
    setSelectedChapters(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  function toggleSubject(subjName: string) {
    const subjChapters = bySubject[subjName]?.map(c => c.id) ?? [];
    const allSelected = subjChapters.every(id => selectedChapters.includes(id));
    setSelectedChapters(prev =>
      allSelected
        ? prev.filter(id => !subjChapters.includes(id))
        : [...new Set([...prev, ...subjChapters])]
    );
  }

  function setMinutes(subjectId: string, val: number) {
    setSubjectMinutes(prev => ({
      ...prev,
      [subjectId]: Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, val)),
    }));
  }

  async function deleteTest(testId: string) {
    setDeleting(testId);
    try {
      const res = await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? 'Failed to delete test');
      } else {
        toast.success('Test deleted');
        router.refresh();
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setDeleting(null);
  }

  async function handleCreate() {
    if (!testName.trim() || !testDate || !selectedChapters.length) {
      toast.error('Fill in test name, date, and select at least one chapter');
      return;
    }
    if (planStartDate && planStartDate >= testDate) {
      toast.error('Start date must be before the test date');
      return;
    }
    setLoading(true);

    const subject_config = activeSubjects.map(s => ({
      subject_id: s.subject_id,
      subject_name: s.subject_name,
      daily_minutes: subjectMinutes[s.subject_id] ?? DEFAULT_MINUTES,
    }));

    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: testName.trim(),
          test_date: testDate,
          chapter_ids: selectedChapters,
          subject_config,
          plan_start_date: planStartDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to create test');
      } else {
        toast.success('Test planned! Generating your study schedule…');
        setShowForm(false);
        setTestName('');
        setTestDate('');
        setPlanStartDate('');
        setSelectedChapters([]);
        setSubjectMinutes({});
        router.refresh();
        router.push(`/study-plan/${json.data.id}`);
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 px-6 py-5 text-white shadow-md flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Study Planner</h1>
          <p className="text-purple-100 text-sm mt-0.5">Plan your study schedule for upcoming tests</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-white text-purple-700 hover:bg-purple-50 font-semibold shadow shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Study Plan
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 flex items-center gap-2 text-white">
            <CalendarCheck className="h-5 w-5" />
            <span className="font-semibold">Schedule New Study Plan</span>
          </div>
          <CardContent className="p-5 space-y-5">
            {/* Test name + date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 font-medium">Plan Name</Label>
                <Input
                  placeholder="e.g. Unit Test 1, Mid-Term"
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 font-medium">Test / Exam Date</Label>
                <Input
                  type="date"
                  min={minDateStr}
                  value={testDate}
                  onChange={e => setTestDate(e.target.value)}
                />
              </div>
            </div>

            {/* Study plan start date */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-gray-700 font-medium">
                <CalendarCheck className="h-3.5 w-3.5 text-violet-500" />
                Study Plan Start Date
              </Label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                max={testDate || undefined}
                value={planStartDate}
                onChange={e => setPlanStartDate(e.target.value)}
                placeholder="Select start date"
              />
              <p className="text-xs text-gray-400">
                When should your study schedule begin? Leave blank to start from today.
              </p>
            </div>

            {/* Chapter selection grouped by subject */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                Select Chapters
                {selectedChapters.length > 0 && (
                  <span className="ml-2 text-xs font-normal bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                    {selectedChapters.length} selected
                  </span>
                )}
              </Label>
              {chapters.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No ready chapters.{' '}
                  <Link href="/upload" className="text-violet-600 underline">Upload chapters first</Link>
                </p>
              ) : (
                <div className="border border-gray-200 rounded-xl divide-y overflow-hidden max-h-72 overflow-y-auto">
                  {Object.entries(bySubject).map(([subjName, chs]) => {
                    const allSel = chs.every(c => selectedChapters.includes(c.id));
                    const someSel = chs.some(c => selectedChapters.includes(c.id));
                    return (
                      <div key={subjName}>
                        {/* Subject header row — click to toggle all */}
                        <label className="flex items-center gap-3 px-3 py-2.5 bg-violet-50 cursor-pointer hover:bg-violet-100 transition-colors">
                          <Checkbox
                            checked={allSel}
                            data-state={someSel && !allSel ? 'indeterminate' : undefined}
                            onCheckedChange={() => toggleSubject(subjName)}
                          />
                          <span className="text-xs font-bold text-violet-700 uppercase tracking-wide">
                            {subjName}
                          </span>
                          <span className="ml-auto text-xs text-violet-500 font-medium">
                            {chs.filter(c => selectedChapters.includes(c.id)).length}/{chs.length}
                          </span>
                        </label>
                        {chs.map(ch => (
                          <label key={ch.id} className={`flex items-center gap-3 px-3 py-2.5 pl-8 cursor-pointer transition-colors ${
                            selectedChapters.includes(ch.id) ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'
                          }`}>
                            <Checkbox
                              checked={selectedChapters.includes(ch.id)}
                              onCheckedChange={() => toggleChapter(ch.id)}
                            />
                            <span className="text-sm text-gray-800">{ch.name}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Per-subject daily time allocation */}
            {activeSubjects.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-gray-700 font-medium">
                  <Clock className="h-3.5 w-3.5 text-violet-500" />
                  Daily Study Time per Subject
                </Label>
                <div className="space-y-2">
                  {activeSubjects.map(s => {
                    const mins = subjectMinutes[s.subject_id] ?? DEFAULT_MINUTES;
                    return (
                      <div key={s.subject_id} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100">
                        <span className="text-sm font-semibold text-gray-800 flex-1">{s.subject_name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setMinutes(s.subject_id, mins - 5)}
                            className="h-7 w-7 rounded-full border border-violet-200 bg-white flex items-center justify-center text-violet-600 hover:bg-violet-50 transition-colors shadow-sm"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-bold text-violet-700 w-16 text-center bg-white rounded-lg py-1 border border-violet-100 shadow-sm">
                            {mins} min
                          </span>
                          <button
                            type="button"
                            onClick={() => setMinutes(s.subject_id, mins + 5)}
                            className="h-7 w-7 rounded-full border border-violet-200 bg-white flex items-center justify-center text-violet-600 hover:bg-violet-50 transition-colors shadow-sm"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 pt-1">
                  <Clock className="h-3 w-3 text-violet-500" />
                  Total daily study time:{' '}
                  <span className="font-bold text-violet-700">{totalDailyMinutes} min</span>
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={loading || !selectedChapters.length || !testName.trim() || !testDate || (!!planStartDate && !!testDate && planStartDate >= testDate)}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating plan…</>
                  : 'Create Study Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test list */}
      {tests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="h-8 w-8 text-violet-400" />
          </div>
          <p className="font-semibold text-gray-500">No tests scheduled</p>
          <p className="text-sm mt-1">Add an upcoming test to get a personalised study plan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map(test => {
            const days = Math.ceil((new Date(test.test_date).getTime() - Date.now()) / 86_400_000);
            const cardGradient = days <= 1
              ? 'from-red-50 to-rose-50 border-red-200'
              : days <= 3
              ? 'from-amber-50 to-orange-50 border-amber-200'
              : 'from-emerald-50 to-teal-50 border-emerald-200';
            const badgeColor = days <= 1
              ? 'bg-red-100 text-red-700'
              : days <= 3
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700';

            return (
              <Card key={test.id} className={`border bg-gradient-to-r ${cardGradient} shadow-sm hover:shadow-md transition-shadow`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-gray-900">{test.name}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {daysLabel(test.test_date)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="text-gray-400 text-xs font-medium">Exam date: </span>
                        {new Date(test.test_date).toLocaleDateString('en-IN', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                      {test.plan_start_date && (
                        <p className="text-sm text-gray-600">
                          <span className="text-gray-400 text-xs font-medium">Plan starts: </span>
                          {new Date(test.plan_start_date).toLocaleDateString('en-IN', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        <BookOpen className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {test.chapter_ids.length} chapter{test.chapter_ids.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/study-plan/${test.id}`}>
                        <Button size="sm" className="gap-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm">
                          View Plan <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                      <button
                        onClick={() => deleteTest(test.id)}
                        disabled={deleting === test.id}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete test plan"
                      >
                        {deleting === test.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
