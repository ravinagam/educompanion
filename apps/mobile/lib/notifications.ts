import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Save token to user profile
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('users').update({ expo_push_token: token }).eq('id', user.id);
  }

  return token;
}

export async function scheduleDailyStudyReminder(hour: number, minute: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📚 Time to Study!',
      body: 'Your daily study session is waiting. Open EduCompanion to check today\'s plan.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleTestReminder(testName: string, daysUntilTest: number, testDate: string) {
  if (daysUntilTest <= 0) return;
  const triggerDate = new Date(testDate);
  triggerDate.setDate(triggerDate.getDate() - Math.min(daysUntilTest, 3));
  triggerDate.setHours(8, 0, 0, 0);

  if (triggerDate > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📝 ${testName} is coming up!`,
        body: `Your test is in ${daysUntilTest} days. Stay on track with your study plan.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
}
