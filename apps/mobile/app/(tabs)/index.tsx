import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface StudyPlan {
  id: string;
  day_date: string;
  estimated_minutes: number;
  is_completed: boolean;
  topics: string[];
  chapter: { id: string; name: string } | null;
  test: { id: string; name: string; test_date: string } | null;
}

interface UpcomingTest {
  id: string;
  name: string;
  test_date: string;
  days_remaining: number;
}

function urgencyColor(days: number) {
  if (days <= 1) return '#ef4444';
  if (days <= 3) return '#f59e0b';
  return '#22c55e';
}

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name?: string } | null>(null);
  const [todayPlans, setTodayPlans] = useState<StudyPlan[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<UpcomingTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.replace('/(auth)/login'); return; }
    setUser(authUser);

    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const [plansRes, testsRes] = await Promise.all([
      supabase
        .from('study_plans')
        .select('*, chapter:chapters(id, name), test:tests!inner(id, name, test_date, user_id)')
        .eq('day_date', today)
        .eq('tests.user_id', authUser.id),
      supabase
        .from('tests')
        .select('*')
        .eq('user_id', authUser.id)
        .gte('test_date', today)
        .order('test_date')
        .limit(3),
    ]);

    setTodayPlans(plansRes.data ?? []);
    setUpcomingTests(
      (testsRes.data ?? []).map(t => ({
        ...t,
        days_remaining: Math.ceil((new Date(t.test_date).getTime() - todayDate.getTime()) / 86400000),
      }))
    );
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const completed = todayPlans.filter(p => p.is_completed).length;
  const pct = todayPlans.length > 0 ? Math.round((completed / todayPlans.length) * 100) : 0;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      {/* Today's Plan */}
      <View className="bg-blue-600 rounded-2xl p-4 mb-4">
        <Text className="text-white font-semibold text-base mb-1">Today&apos;s Study Plan</Text>
        <Text className="text-blue-200 text-sm mb-3">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        <View className="flex-row items-center gap-2 mb-2">
          <View className="flex-1 bg-blue-500 rounded-full h-2">
            <View className="bg-white rounded-full h-2" style={{ width: `${pct}%` }} />
          </View>
          <Text className="text-white text-sm font-medium">{completed}/{todayPlans.length}</Text>
        </View>

        {todayPlans.length === 0 ? (
          <Text className="text-blue-200 text-sm">No sessions planned for today.</Text>
        ) : (
          todayPlans.slice(0, 3).map(plan => (
            <View key={plan.id} className="flex-row items-center gap-2 mt-2">
              <Ionicons
                name={plan.is_completed ? 'checkmark-circle' : 'time-outline'}
                size={16}
                color="white"
              />
              <Text className="text-white text-sm flex-1" numberOfLines={1}>
                {plan.chapter?.name} · {plan.estimated_minutes}m
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Upcoming Tests */}
      {upcomingTests.length > 0 && (
        <View className="mb-4">
          <Text className="text-base font-bold text-gray-900 mb-3">Upcoming Tests</Text>
          {upcomingTests.map(test => (
            <Link key={test.id} href={`/(tabs)/tests`} asChild>
              <TouchableOpacity className="bg-white rounded-xl border border-gray-100 p-4 mb-2 flex-row items-center justify-between">
                <View>
                  <Text className="font-semibold text-gray-900">{test.name}</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    {new Date(test.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: urgencyColor(test.days_remaining) + '20' }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: urgencyColor(test.days_remaining) }}
                  >
                    {test.days_remaining}d left
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <Text className="text-base font-bold text-gray-900 mb-3">Quick Actions</Text>
      <View className="flex-row flex-wrap gap-3">
        {[
          { label: 'Upload Chapter', icon: 'cloud-upload-outline', href: '/(tabs)/upload', color: '#dbeafe', iconColor: '#2563eb' },
          { label: 'Plan a Test', icon: 'calendar-outline', href: '/(tabs)/tests', color: '#ede9fe', iconColor: '#7c3aed' },
          { label: 'My Chapters', icon: 'book-outline', href: '/(tabs)/chapters', color: '#d1fae5', iconColor: '#059669' },
        ].map(item => (
          <Link key={item.label} href={item.href as never} asChild>
            <TouchableOpacity
              className="rounded-2xl p-4 items-center justify-center"
              style={{ backgroundColor: item.color, width: '47%', minHeight: 90 }}
            >
              <Ionicons name={item.icon as never} size={28} color={item.iconColor} />
              <Text className="text-xs font-medium text-gray-700 mt-2 text-center">{item.label}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
