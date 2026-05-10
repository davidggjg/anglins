import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getNotificationTime, saveNotificationTime } from './storage';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'תזכורת יומית',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('streak-warning', {
      name: 'אזהרת רצף',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FF6B35',
    });
  }

  return true;
};

export const scheduleDailyReminder = async (hour = 19, minute = 0) => {
  // Cancel existing notifications
  await cancelAllNotifications();

  await saveNotificationTime(hour, minute);

  const messages = [
    { title: '📚 זמן ללמוד אנגלית!', body: 'השיעור היומי שלך מחכה לך. רק 5 דקות ביום! 🚀' },
    { title: '🔥 שמור על הרצף!', body: 'אל תשכח לתרגל היום. הרצף שלך בסכנה! ⚡' },
    { title: '🌟 English Master', body: 'מילה חדשה ביום - רמה גבוהה לכל החיים! 💪' },
    { title: '⏰ תזכורת לימוד', body: 'רק דקות ספורות יכולות לשנות את האנגלית שלך! 🎯' },
    { title: '🏆 הגיע הזמן להתקדם!', body: 'הצוות שלך כבר מתרגל. מה איתך? 📖' },
  ];

  // Schedule a daily notification
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: randomMsg.title,
      body: randomMsg.body,
      sound: 'default',
      badge: 1,
      data: { type: 'daily_reminder' },
      ...(Platform.OS === 'android' && { channelId: 'daily-reminder' }),
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });

  return id;
};

export const scheduleStreakWarning = async () => {
  // Send a warning 2 hours before the streak breaks (midnight)
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ הרצף שלך בסכנה!',
      body: 'עוד שעתיים הרצף שלך יאבד. תרגל עכשיו ושמור עליו! 🔥',
      sound: 'default',
      badge: 1,
      data: { type: 'streak_warning' },
      ...(Platform.OS === 'android' && { channelId: 'streak-warning' }),
    },
    trigger: {
      hour: 22,
      minute: 0,
      repeats: true,
    },
  });

  return id;
};

export const scheduleWeeklyReview = async () => {
  // Weekly review on Sunday at 10 AM
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 סיכום שבועי!',
      body: 'ראה את ההתקדמות שלך השבוע - תוצאות מדהימות מחכות לך! 🎉',
      sound: 'default',
      data: { type: 'weekly_review' },
      ...(Platform.OS === 'android' && { channelId: 'daily-reminder' }),
    },
    trigger: {
      weekday: 1, // Sunday
      hour: 10,
      minute: 0,
      repeats: true,
    },
  });

  return id;
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const setupAllNotifications = async (hour, minute) => {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  await scheduleDailyReminder(hour, minute);
  await scheduleStreakWarning();
  await scheduleWeeklyReview();

  return true;
};

export const getScheduledNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
};

// Handle notification responses (when user taps notification)
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};
