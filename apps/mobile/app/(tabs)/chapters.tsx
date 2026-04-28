import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface Chapter {
  id: string;
  name: string;
  upload_status: string;
  subject_name: string;
}

export default function ChaptersScreen() {
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadChapters() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/(auth)/login'); return; }

    const { data } = await supabase
      .from('chapters')
      .select('id, name, upload_status, subjects!inner(name, user_id)')
      .eq('subjects.user_id', user.id)
      .order('created_at', { ascending: false });

    setChapters(
      (data ?? []).map(c => ({
        ...c,
        subject_name: (c.subjects as { name: string }).name,
      }))
    );
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { loadChapters(); }, []);

  const readyChapters = chapters.filter(c => c.upload_status === 'ready');

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChapters(); }} />}
    >
      <Text className="text-xl font-bold text-gray-900 mb-1">My Chapters</Text>
      <Text className="text-gray-400 text-sm mb-4">{readyChapters.length} ready for study</Text>

      {chapters.length === 0 ? (
        <View className="items-center py-12">
          <Ionicons name="book-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 font-medium mt-3">No chapters yet</Text>
          <Link href="/(tabs)/upload" asChild>
            <TouchableOpacity className="mt-3 bg-blue-600 rounded-xl px-5 py-2.5">
              <Text className="text-white font-medium">Upload First Chapter</Text>
            </TouchableOpacity>
          </Link>
        </View>
      ) : (
        chapters.map(chapter => (
          <View key={chapter.id} className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-2">
                <Text className="font-semibold text-gray-900">{chapter.name}</Text>
                <Text className="text-gray-400 text-xs mt-0.5">{chapter.subject_name}</Text>
              </View>
              <View
                className="px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor:
                    chapter.upload_status === 'ready' ? '#dcfce7' :
                    chapter.upload_status === 'processing' ? '#dbeafe' : '#fef3c7'
                }}
              >
                <Text
                  className="text-xs font-medium capitalize"
                  style={{
                    color:
                      chapter.upload_status === 'ready' ? '#16a34a' :
                      chapter.upload_status === 'processing' ? '#2563eb' : '#d97706'
                  }}
                >
                  {chapter.upload_status}
                </Text>
              </View>
            </View>

            {chapter.upload_status === 'ready' && (
              <View className="flex-row gap-2">
                <Link href={`/(tabs)/chapters/${chapter.id}?type=quiz`} asChild>
                  <TouchableOpacity className="flex-1 bg-blue-50 rounded-lg py-2 items-center flex-row justify-center gap-1">
                    <Ionicons name="flask-outline" size={14} color="#2563eb" />
                    <Text className="text-blue-700 text-xs font-medium">Quiz</Text>
                  </TouchableOpacity>
                </Link>
                <Link href={`/(tabs)/chapters/${chapter.id}?type=flashcards`} asChild>
                  <TouchableOpacity className="flex-1 bg-purple-50 rounded-lg py-2 items-center flex-row justify-center gap-1">
                    <Ionicons name="layers-outline" size={14} color="#7c3aed" />
                    <Text className="text-purple-700 text-xs font-medium">Cards</Text>
                  </TouchableOpacity>
                </Link>
                <Link href={`/(tabs)/chapters/${chapter.id}?type=video`} asChild>
                  <TouchableOpacity className="flex-1 bg-green-50 rounded-lg py-2 items-center flex-row justify-center gap-1">
                    <Ionicons name="play-circle-outline" size={14} color="#059669" />
                    <Text className="text-green-700 text-xs font-medium">Video</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
