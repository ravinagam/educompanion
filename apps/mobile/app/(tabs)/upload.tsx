import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface Chapter {
  id: string;
  name: string;
  upload_status: string;
  complexity_score: number | null;
  file_name: string | null;
}

interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'ready' ? '#22c55e' :
    status === 'processing' ? '#3b82f6' :
    status === 'uploading' ? '#f59e0b' : '#ef4444';

  return (
    <View className="flex-row items-center gap-1">
      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs capitalize" style={{ color }}>{status}</Text>
    </View>
  );
}

export default function UploadScreen() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  async function loadSubjects() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/(auth)/login'); return; }

    const { data } = await supabase
      .from('subjects')
      .select('*, chapters(id, name, upload_status, complexity_score, file_name)')
      .eq('user_id', user.id)
      .order('created_at');

    setSubjects(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { loadSubjects(); }, []);

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/*'],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream', size: asset.size ?? 0 });
      if (!chapterName) setChapterName(asset.name.replace(/\.[^.]+$/, ''));
    }
  }

  async function handleUpload() {
    if (!selectedFile || !selectedSubject || !chapterName.trim()) {
      Alert.alert('Missing Info', 'Select a subject, chapter name, and file.');
      return;
    }

    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append('file', { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.mimeType } as never);
    formData.append('subjectId', selectedSubject);
    formData.append('chapterName', chapterName.trim());

    try {
      const res = await fetch(`${API_URL}/api/chapters/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        Alert.alert('Upload Failed', json.error ?? 'Unknown error');
      } else {
        Alert.alert('Success', 'Chapter uploaded! Processing in background.');
        setSelectedFile(null);
        setChapterName('');
        loadSubjects();
      }
    } catch (e) {
      Alert.alert('Error', 'Upload failed. Check your connection.');
    }
    setUploading(false);
  }

  async function generateContent(chapterId: string, type: 'quiz' | 'flashcards' | 'video-script') {
    const key = chapterId + type;
    setGenerating(g => ({ ...g, [key]: true }));
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(`${API_URL}/api/generate/${type}/${chapterId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const json = await res.json();
    setGenerating(g => ({ ...g, [key]: false }));

    if (!res.ok) {
      Alert.alert('Failed', json.error ?? 'Generation failed');
    } else {
      Alert.alert('Done', `${type === 'quiz' ? 'Quiz' : type === 'flashcards' ? 'Flashcards' : 'Video script'} generated!`);
    }
  }

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSubjects(); }} />}
    >
      <Text className="text-xl font-bold text-gray-900 mb-1">Upload Material</Text>
      <Text className="text-gray-400 text-sm mb-4">Add chapter PDFs or documents</Text>

      {/* Upload Form */}
      <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-5">
        <Text className="font-semibold text-gray-800 mb-3">Add New Chapter</Text>

        {/* Subject */}
        <Text className="text-sm text-gray-600 mb-1">Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row gap-2">
            {subjects.map(s => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSelectedSubject(s.id)}
                className={`px-3 py-2 rounded-xl border ${selectedSubject === s.id ? 'bg-blue-600 border-blue-600' : 'border-gray-200 bg-gray-50'}`}
              >
                <Text className={`text-sm font-medium ${selectedSubject === s.id ? 'text-white' : 'text-gray-700'}`}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Chapter name */}
        <Text className="text-sm text-gray-600 mb-1">Chapter Name</Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm mb-3"
          placeholder="e.g. Chapter 3: Cells"
          value={chapterName}
          onChangeText={setChapterName}
        />

        {/* File picker */}
        <TouchableOpacity
          onPress={pickDocument}
          className="border-2 border-dashed border-gray-200 rounded-xl p-5 items-center mb-3"
        >
          <Ionicons name="document-outline" size={32} color={selectedFile ? '#2563eb' : '#d1d5db'} />
          <Text className="text-sm font-medium text-gray-700 mt-2">
            {selectedFile ? selectedFile.name : 'Tap to select file'}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">PDF, DOCX, TXT up to 50 MB</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading || !selectedFile || !selectedSubject || !chapterName.trim()}
          className="bg-blue-600 rounded-xl py-3.5 items-center"
          style={{ opacity: uploading || !selectedFile || !selectedSubject || !chapterName.trim() ? 0.5 : 1 }}
        >
          {uploading
            ? <ActivityIndicator color="white" />
            : (
              <View className="flex-row items-center gap-2">
                <Ionicons name="cloud-upload-outline" size={18} color="white" />
                <Text className="text-white font-semibold">Upload Chapter</Text>
              </View>
            )
          }
        </TouchableOpacity>
      </View>

      {/* Chapter list */}
      {subjects.map(subject => subject.chapters.length > 0 && (
        <View key={subject.id} className="mb-4">
          <Text className="font-semibold text-gray-800 mb-2">{subject.name}</Text>
          {subject.chapters.map(ch => (
            <View key={ch.id} className="bg-white rounded-xl border border-gray-100 p-3 mb-2">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="font-medium text-gray-900 text-sm flex-1 mr-2" numberOfLines={1}>{ch.name}</Text>
                <StatusDot status={ch.upload_status} />
              </View>
              {ch.file_name && <Text className="text-xs text-gray-400 mb-2">{ch.file_name}</Text>}

              {ch.upload_status === 'ready' && (
                <View className="flex-row gap-2 mt-1">
                  {(['quiz', 'flashcards', 'video-script'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => generateContent(ch.id, type)}
                      disabled={generating[ch.id + type]}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 items-center"
                      style={{ opacity: generating[ch.id + type] ? 0.5 : 1 }}
                    >
                      {generating[ch.id + type]
                        ? <ActivityIndicator size="small" color="#2563eb" />
                        : <Text className="text-xs font-medium text-gray-700">
                            {type === 'quiz' ? 'Quiz' : type === 'flashcards' ? 'Cards' : 'Video'}
                          </Text>
                      }
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
