import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, TextInput, Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  progress?: { status: 'known' | 'unknown'; review_count: number } | null;
}

interface QuizQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'fill_blank';
  question: string;
  options?: string[];
}

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

// ─── Flashcards Mode ──────────────────────────────────────────────────────────
function FlashcardsView({ chapterId }: { chapterId: string }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function load() {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_URL}/api/generate/flashcards/${chapterId}`, { headers });
    const json = await res.json();
    setCards(json.data ?? []);
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    const headers = await getAuthHeader();
    const res = await fetch(`${API_URL}/api/generate/flashcards/${chapterId}`, {
      method: 'POST',
      headers,
    });
    const json = await res.json();
    setGenerating(false);
    if (res.ok) {
      await load();
      Alert.alert('Done', 'Flashcards generated!');
    } else {
      Alert.alert('Error', json.error);
    }
  }

  useEffect(() => { load(); }, [chapterId]);

  async function mark(status: 'known' | 'unknown') {
    if (!cards[current] || submitting) return;
    setSubmitting(true);
    const headers = await getAuthHeader();
    await fetch(`${API_URL}/api/flashcard-progress`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcardId: cards[current].id, status }),
    });
    setFlipped(false);
    if (current + 1 >= cards.length) setDone(true);
    else setCurrent(c => c + 1);
    setSubmitting(false);
  }

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2563eb" /></View>;

  if (cards.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Ionicons name="layers-outline" size={48} color="#d1d5db" />
        <Text className="text-gray-500 mt-3 mb-4">No flashcards yet</Text>
        <TouchableOpacity onPress={generate} disabled={generating} className="bg-blue-600 rounded-xl px-6 py-3">
          {generating ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Generate with AI</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  if (done) {
    const known = cards.filter(c => c.progress?.status === 'known').length;
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
        <Text className="text-2xl font-bold text-gray-900 mt-4">Session Done!</Text>
        <Text className="text-gray-500 mt-2">{known}/{cards.length} mastered</Text>
        <TouchableOpacity onPress={() => { setCurrent(0); setDone(false); setFlipped(false); }}
          className="bg-blue-600 rounded-xl px-8 py-3.5 mt-6">
          <Text className="text-white font-semibold">Restart</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card = cards[current];
  return (
    <View className="flex-1 p-4">
      <Text className="text-sm text-gray-400 text-right mb-4">{current + 1} / {cards.length}</Text>

      <TouchableOpacity
        onPress={() => setFlipped(f => !f)}
        activeOpacity={0.9}
        className="flex-1 rounded-2xl border-2 items-center justify-center p-6 mb-4"
        style={{
          borderColor: flipped ? '#a78bfa' : '#93c5fd',
          backgroundColor: flipped ? '#faf5ff' : '#eff6ff',
        }}
      >
        <Text className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: flipped ? '#7c3aed' : '#2563eb' }}>
          {flipped ? 'Definition' : 'Term'}
        </Text>
        <Text className="text-xl font-bold text-center text-gray-900">
          {flipped ? card.definition : card.term}
        </Text>
        <Text className="text-gray-400 text-sm mt-6">Tap to {flipped ? 'hide' : 'reveal'}</Text>
      </TouchableOpacity>

      {flipped && (
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => mark('unknown')}
            disabled={submitting}
            className="flex-1 bg-red-500 rounded-xl py-4 items-center flex-row justify-center gap-2"
          >
            <Ionicons name="thumbs-down-outline" size={18} color="white" />
            <Text className="text-white font-semibold">Don&apos;t Know</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => mark('known')}
            disabled={submitting}
            className="flex-1 bg-green-500 rounded-xl py-4 items-center flex-row justify-center gap-2"
          >
            <Ionicons name="thumbs-up-outline" size={18} color="white" />
            <Text className="text-white font-semibold">Got It!</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Quiz Mode ────────────────────────────────────────────────────────────────
function QuizView({ chapterId }: { chapterId: string }) {
  const [quiz, setQuiz] = useState<{ id: string; questions_json: QuizQuestion[] } | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fillText, setFillText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Array<{ correct: boolean; correct_answer: string; explanation: string; questionId: string }> | null>(null);
  const [score, setScore] = useState(0);

  async function load() {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_URL}/api/generate/quiz/${chapterId}`, { headers });
    const json = await res.json();
    setQuiz(json.data);
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    const headers = await getAuthHeader();
    const res = await fetch(`${API_URL}/api/generate/quiz/${chapterId}`, { method: 'POST', headers });
    const json = await res.json();
    setGenerating(false);
    if (res.ok) { setQuiz(json.data); Alert.alert('Done', 'Quiz generated!'); }
    else Alert.alert('Error', json.error);
  }

  useEffect(() => { load(); }, [chapterId]);

  async function submit() {
    const finalAnswers = { ...answers, ...(quiz?.questions_json[current]?.type === 'fill_blank' ? { [quiz.questions_json[current].id]: fillText } : {}) };
    setSubmitting(true);
    const headers = await getAuthHeader();
    const res = await fetch(`${API_URL}/api/quiz-attempts`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: quiz!.id, answers: finalAnswers }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setResults(json.data.results);
      setScore(json.data.score);
    } else Alert.alert('Error', json.error);
  }

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2563eb" /></View>;
  if (!quiz) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Ionicons name="flask-outline" size={48} color="#d1d5db" />
        <Text className="text-gray-500 mt-3 mb-4">No quiz yet</Text>
        <TouchableOpacity onPress={generate} disabled={generating} className="bg-blue-600 rounded-xl px-6 py-3">
          {generating ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Generate with AI</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  const qs = quiz.questions_json;

  if (results) {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="items-center py-6">
          <Ionicons name="trophy" size={56} color={pct >= 70 ? '#f59e0b' : '#6b7280'} />
          <Text className="text-4xl font-bold text-gray-900 mt-2">{pct}%</Text>
          <Text className="text-gray-500">{score} / {qs.length} correct</Text>
        </View>
        <TouchableOpacity onPress={() => { setResults(null); setCurrent(0); setAnswers({}); setFillText(''); }}
          className="bg-blue-600 rounded-xl py-3 items-center mb-4">
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
        {results.map((r, i) => (
          <View key={r.questionId} className={`rounded-xl border p-3 mb-2 ${r.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <Text className="text-sm font-medium text-gray-900 mb-1">Q{i + 1}: {qs.find(q => q.id === r.questionId)?.question}</Text>
            {!r.correct && <Text className="text-xs text-red-600">Correct: {r.correct_answer}</Text>}
            <Text className="text-xs text-gray-500 mt-0.5 italic">{r.explanation}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  const q = qs[current];
  const answered = answers[q.id] || (q.type === 'fill_blank' && fillText);
  const isLast = current === qs.length - 1;

  return (
    <View className="flex-1 p-4">
      <Text className="text-sm text-gray-400 text-right mb-2">{current + 1} / {qs.length}</Text>
      <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-5">
        <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">
          {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'true_false' ? 'True / False' : 'Fill in the Blank'}
        </Text>
        <Text className="text-base font-semibold text-gray-900 mb-5 leading-relaxed">{q.question}</Text>

        {q.options && q.options.map(opt => (
          <TouchableOpacity
            key={opt}
            onPress={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
            className="border rounded-xl px-4 py-3 mb-2"
            style={{
              borderColor: answers[q.id] === opt ? '#2563eb' : '#e5e7eb',
              backgroundColor: answers[q.id] === opt ? '#eff6ff' : 'transparent',
            }}
          >
            <Text className="text-sm" style={{ color: answers[q.id] === opt ? '#1d4ed8' : '#374151', fontWeight: answers[q.id] === opt ? '600' : '400' }}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}

        {q.type === 'fill_blank' && (
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholder="Type your answer..."
            value={fillText}
            onChangeText={setFillText}
          />
        )}
      </View>

      <View className="flex-row gap-3 mt-4">
        {current > 0 && (
          <TouchableOpacity onPress={() => { setCurrent(c => c - 1); setFillText(answers[qs[current-1].id] ?? ''); }}
            className="border border-gray-200 rounded-xl py-3.5 px-5 items-center">
            <Ionicons name="arrow-back" size={18} color="#374151" />
          </TouchableOpacity>
        )}
        {isLast ? (
          <TouchableOpacity
            onPress={submit}
            disabled={!answered || submitting}
            className="flex-1 bg-blue-600 rounded-xl py-3.5 items-center"
            style={{ opacity: !answered || submitting ? 0.5 : 1 }}
          >
            {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Submit Quiz</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => { if (q.type === 'fill_blank') setAnswers(a => ({...a, [q.id]: fillText})); setCurrent(c => c + 1); setFillText(answers[qs[current+1]?.id] ?? ''); }}
            disabled={!answered}
            className="flex-1 bg-blue-600 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
            style={{ opacity: !answered ? 0.5 : 1 }}
          >
            <Text className="text-white font-semibold">Next</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ChapterDetailScreen() {
  const { chapterId, type } = useLocalSearchParams<{ chapterId: string; type: string }>();
  const router = useRouter();
  const mode = (type as string) ?? 'quiz';

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 capitalize">
          {mode === 'video-script' ? 'Video Script' : mode}
        </Text>
      </View>

      {mode === 'flashcards'
        ? <FlashcardsView chapterId={chapterId as string} />
        : <QuizView chapterId={chapterId as string} />
      }
    </View>
  );
}
