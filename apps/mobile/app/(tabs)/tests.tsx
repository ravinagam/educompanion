import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Test { id: string; name: string; test_date: string; chapter_ids: string[] }
interface Chapter { id: string; name: string; subject_name: string }

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function urgencyBg(days: number) {
  if (days <= 1) return '#fef2f2';
  if (days <= 3) return '#fffbeb';
  return '#f0fdf4';
}

function urgencyText(days: number) {
  if (days <= 1) return '#dc2626';
  if (days <= 3) return '#d97706';
  return '#16a34a';
}

export default function TestsScreen() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/(auth)/login'); return; }

    const today = new Date().toISOString().split('T')[0];
    const [testsRes, chaptersRes] = await Promise.all([
      supabase.from('tests').select('*').eq('user_id', user.id).order('test_date'),
      supabase
        .from('chapters')
        .select('id, name, subjects!inner(id, name, user_id)')
        .eq('subjects.user_id', user.id)
        .eq('upload_status', 'ready'),
    ]);

    setTests(testsRes.data ?? []);
    setChapters(
      (chaptersRes.data ?? []).map(c => ({
        ...c,
        subject_name: (c.subjects as { name: string }).name,
      }))
    );
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { loadData(); }, []);

  function toggleChapter(id: string) {
    setSelectedChapters(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  async function createTest() {
    if (!testName.trim() || !testDate || !selectedChapters.length) {
      Alert.alert('Missing Info', 'Fill in test name, date, and select chapters.');
      return;
    }
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${API_URL}/api/tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ name: testName.trim(), test_date: testDate, chapter_ids: selectedChapters }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      Alert.alert('Failed', json.error ?? 'Error creating test');
    } else {
      Alert.alert('Success', 'Test created! Study plan is being generated.');
      setShowForm(false);
      setTestName('');
      setTestDate('');
      setSelectedChapters([]);
      loadData();
    }
  }

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xl font-bold text-gray-900">Test Planner</Text>
          <Text className="text-gray-400 text-sm">Schedule your upcoming tests</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          className="bg-blue-600 rounded-xl px-4 py-2.5 flex-row items-center gap-1"
        >
          <Ionicons name="add" size={16} color="white" />
          <Text className="text-white font-medium text-sm">New Test</Text>
        </TouchableOpacity>
      </View>

      {/* Create Form */}
      {showForm && (
        <View className="bg-white rounded-2xl border border-blue-100 p-4 mb-4">
          <Text className="font-semibold text-gray-800 mb-3">Schedule New Test</Text>

          <Text className="text-sm text-gray-600 mb-1">Test Name</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-3"
            placeholder="e.g. Unit Test 1"
            value={testName}
            onChangeText={setTestName}
          />

          <Text className="text-sm text-gray-600 mb-1">Test Date (YYYY-MM-DD)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-3"
            placeholder="2025-02-15"
            value={testDate}
            onChangeText={setTestDate}
            keyboardType="numbers-and-punctuation"
          />

          <Text className="text-sm text-gray-600 mb-2">Select Chapters ({selectedChapters.length} selected)</Text>
          {chapters.length === 0 ? (
            <Text className="text-gray-400 text-sm py-2">No ready chapters. Upload chapters first.</Text>
          ) : (
            chapters.map(ch => (
              <TouchableOpacity
                key={ch.id}
                onPress={() => toggleChapter(ch.id)}
                className="flex-row items-center gap-3 py-2.5 border-b border-gray-50"
              >
                <View
                  className="w-5 h-5 rounded border items-center justify-center"
                  style={{
                    backgroundColor: selectedChapters.includes(ch.id) ? '#2563eb' : 'transparent',
                    borderColor: selectedChapters.includes(ch.id) ? '#2563eb' : '#d1d5db',
                  }}
                >
                  {selectedChapters.includes(ch.id) && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
                <View>
                  <Text className="text-sm text-gray-800">{ch.name}</Text>
                  <Text className="text-xs text-gray-400">{ch.subject_name}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View className="flex-row gap-2 mt-4">
            <TouchableOpacity
              onPress={() => setShowForm(false)}
              className="flex-1 border border-gray-200 rounded-xl py-3 items-center"
            >
              <Text className="text-gray-600 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={createTest}
              disabled={creating}
              className="flex-1 bg-blue-600 rounded-xl py-3 items-center"
              style={{ opacity: creating ? 0.7 : 1 }}
            >
              {creating
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-semibold">Create Test</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tests List */}
      {tests.length === 0 ? (
        <View className="items-center py-12">
          <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 font-medium mt-3">No tests scheduled</Text>
          <Text className="text-gray-400 text-sm mt-1">Tap &quot;New Test&quot; to get started</Text>
        </View>
      ) : (
        tests.map(test => {
          const days = daysUntil(test.test_date);
          return (
            <View
              key={test.id}
              className="rounded-xl border border-gray-100 p-4 mb-3"
              style={{ backgroundColor: urgencyBg(days) }}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="font-bold text-gray-900 flex-1 mr-2">{test.name}</Text>
                <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: urgencyText(days) + '20' }}>
                  <Text className="text-xs font-bold" style={{ color: urgencyText(days) }}>
                    {days <= 0 ? 'Past' : `${days}d`}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-500 text-sm">
                {new Date(test.test_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}
              </Text>
              <Text className="text-gray-400 text-xs mt-0.5">{test.chapter_ids.length} chapters</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
