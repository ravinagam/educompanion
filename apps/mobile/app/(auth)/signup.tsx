import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { BOARDS, GRADES } from '@educompanion/shared';

export default function SignupScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', grade: '9', board: 'CBSE' });
  const [loading, setLoading] = useState(false);

  function update(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSignup() {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { name: form.name, grade: Number(form.grade), board: form.board },
      },
    });
    if (error) {
      Alert.alert('Signup Failed', error.message);
    } else if (data.user) {
      router.replace('/onboarding');
    }
    setLoading(false);
  }

  const grades = GRADES.map(String);
  const boards = [...BOARDS];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-10">
          <View className="items-center mb-8">
            <View className="w-14 h-14 bg-blue-600 rounded-2xl items-center justify-center mb-3">
              <Text className="text-white text-xl font-bold">EC</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">Create Account</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Full Name</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base"
                placeholder="Your full name"
                value={form.name}
                onChangeText={v => update('name', v)}
              />
            </View>

            {/* Grade selector */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Grade</Text>
              <View className="flex-row gap-2">
                {grades.map(g => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => update('grade', g)}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      form.grade === g ? 'bg-blue-600 border-blue-600' : 'border-gray-200'
                    }`}
                  >
                    <Text className={`font-semibold ${form.grade === g ? 'text-white' : 'text-gray-700'}`}>
                      Class {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Board selector */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Board</Text>
              <View className="flex-row flex-wrap gap-2">
                {boards.map(b => (
                  <TouchableOpacity
                    key={b}
                    onPress={() => update('board', b)}
                    className={`px-4 py-2.5 rounded-xl border ${
                      form.board === b ? 'bg-blue-600 border-blue-600' : 'border-gray-200'
                    }`}
                  >
                    <Text className={`font-medium text-sm ${form.board === b ? 'text-white' : 'text-gray-700'}`}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base"
                placeholder="student@school.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={v => update('email', v)}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base"
                placeholder="Min 8 characters"
                secureTextEntry
                value={form.password}
                onChangeText={v => update('password', v)}
              />
            </View>

            <TouchableOpacity
              onPress={handleSignup}
              disabled={loading}
              className="bg-blue-600 rounded-xl py-4 items-center mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-semibold text-base">Create Account</Text>
              }
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500 text-sm">Already have an account? </Text>
            <Link href="/(auth)/login">
              <Text className="text-blue-600 font-medium text-sm">Sign in</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
