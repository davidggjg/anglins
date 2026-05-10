import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Keys
const KEYS = {
  GROQ_API_KEY: 'groq_api_key',
  USER_PROFILE: 'user_profile',
  USER_LEVEL: 'user_level',
  LESSONS_HISTORY: 'lessons_history',
  STREAK: 'streak',
  LAST_PRACTICE_DATE: 'last_practice_date',
  XP_POINTS: 'xp_points',
  WORDS_LEARNED: 'words_learned',
  NOTIFICATION_TIME: 'notification_time',
  ONBOARDING_DONE: 'onboarding_done',
  DAILY_WORDS: 'daily_words',
  MISTAKES_BANK: 'mistakes_bank',
};

// Secure storage for API key
export const saveApiKey = async (apiKey) => {
  try {
    await SecureStore.setItemAsync(KEYS.GROQ_API_KEY, apiKey);
    return true;
  } catch (error) {
    // Fallback to AsyncStorage if SecureStore not available
    await AsyncStorage.setItem(KEYS.GROQ_API_KEY, apiKey);
    return true;
  }
};

export const getApiKey = async () => {
  try {
    const key = await SecureStore.getItemAsync(KEYS.GROQ_API_KEY);
    if (key) return key;
    // Fallback
    return await AsyncStorage.getItem(KEYS.GROQ_API_KEY);
  } catch (error) {
    return await AsyncStorage.getItem(KEYS.GROQ_API_KEY);
  }
};

export const deleteApiKey = async () => {
  try {
    await SecureStore.deleteItemAsync(KEYS.GROQ_API_KEY);
  } catch {}
  await AsyncStorage.removeItem(KEYS.GROQ_API_KEY);
};

// User Profile
export const saveUserProfile = async (profile) => {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
};

export const getUserProfile = async () => {
  const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
};

// Level
export const saveUserLevel = async (level) => {
  await AsyncStorage.setItem(KEYS.USER_LEVEL, JSON.stringify(level));
};

export const getUserLevel = async () => {
  const data = await AsyncStorage.getItem(KEYS.USER_LEVEL);
  return data ? JSON.parse(data) : null;
};

// Streak
export const getStreak = async () => {
  const streak = await AsyncStorage.getItem(KEYS.STREAK);
  const lastDate = await AsyncStorage.getItem(KEYS.LAST_PRACTICE_DATE);
  
  if (!streak || !lastDate) return { streak: 0, lastDate: null };
  
  const last = new Date(lastDate);
  const today = new Date();
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 1) {
    // Streak broken
    await AsyncStorage.setItem(KEYS.STREAK, '0');
    return { streak: 0, lastDate };
  }
  
  return { streak: parseInt(streak), lastDate };
};

export const updateStreak = async () => {
  const { streak, lastDate } = await getStreak();
  const today = new Date().toISOString().split('T')[0];
  
  if (lastDate === today) return streak; // Already practiced today
  
  const newStreak = streak + 1;
  await AsyncStorage.setItem(KEYS.STREAK, newStreak.toString());
  await AsyncStorage.setItem(KEYS.LAST_PRACTICE_DATE, today);
  return newStreak;
};

// XP Points
export const getXP = async () => {
  const xp = await AsyncStorage.getItem(KEYS.XP_POINTS);
  return xp ? parseInt(xp) : 0;
};

export const addXP = async (points) => {
  const current = await getXP();
  const newXP = current + points;
  await AsyncStorage.setItem(KEYS.XP_POINTS, newXP.toString());
  return newXP;
};

// Words Learned
export const getWordsLearned = async () => {
  const data = await AsyncStorage.getItem(KEYS.WORDS_LEARNED);
  return data ? JSON.parse(data) : [];
};

export const addWordLearned = async (word) => {
  const words = await getWordsLearned();
  if (!words.find(w => w.word === word.word)) {
    words.push({ ...word, learnedAt: new Date().toISOString() });
    await AsyncStorage.setItem(KEYS.WORDS_LEARNED, JSON.stringify(words));
  }
};

// Mistakes Bank - words to review
export const getMistakesBank = async () => {
  const data = await AsyncStorage.getItem(KEYS.MISTAKES_BANK);
  return data ? JSON.parse(data) : [];
};

export const addToMistakesBank = async (item) => {
  const mistakes = await getMistakesBank();
  const existing = mistakes.findIndex(m => m.id === item.id);
  if (existing >= 0) {
    mistakes[existing].count = (mistakes[existing].count || 1) + 1;
    mistakes[existing].lastMistake = new Date().toISOString();
  } else {
    mistakes.push({ ...item, count: 1, lastMistake: new Date().toISOString() });
  }
  await AsyncStorage.setItem(KEYS.MISTAKES_BANK, JSON.stringify(mistakes));
};

export const removeFromMistakesBank = async (id) => {
  const mistakes = await getMistakesBank();
  const filtered = mistakes.filter(m => m.id !== id);
  await AsyncStorage.setItem(KEYS.MISTAKES_BANK, JSON.stringify(filtered));
};

// Notification Time
export const saveNotificationTime = async (hour, minute) => {
  await AsyncStorage.setItem(KEYS.NOTIFICATION_TIME, JSON.stringify({ hour, minute }));
};

export const getNotificationTime = async () => {
  const data = await AsyncStorage.getItem(KEYS.NOTIFICATION_TIME);
  return data ? JSON.parse(data) : { hour: 19, minute: 0 }; // Default 7 PM
};

// Onboarding
export const setOnboardingDone = async () => {
  await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, 'true');
};

export const isOnboardingDone = async () => {
  const data = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
  return data === 'true';
};

// Daily Words
export const saveDailyWords = async (words) => {
  const today = new Date().toISOString().split('T')[0];
  await AsyncStorage.setItem(KEYS.DAILY_WORDS, JSON.stringify({ date: today, words }));
};

export const getDailyWords = async () => {
  const data = await AsyncStorage.getItem(KEYS.DAILY_WORDS);
  if (!data) return null;
  const { date, words } = JSON.parse(data);
  const today = new Date().toISOString().split('T')[0];
  if (date !== today) return null; // Different day
  return words;
};

// Lessons History
export const saveLessonResult = async (result) => {
  const data = await AsyncStorage.getItem(KEYS.LESSONS_HISTORY);
  const history = data ? JSON.parse(data) : [];
  history.unshift({ ...result, date: new Date().toISOString() });
  // Keep last 100 lessons
  if (history.length > 100) history.splice(100);
  await AsyncStorage.setItem(KEYS.LESSONS_HISTORY, JSON.stringify(history));
};

export const getLessonsHistory = async () => {
  const data = await AsyncStorage.getItem(KEYS.LESSONS_HISTORY);
  return data ? JSON.parse(data) : [];
};

// Stats
export const getUserStats = async () => {
  const [xp, words, history, streakData] = await Promise.all([
    getXP(),
    getWordsLearned(),
    getLessonsHistory(),
    getStreak(),
  ]);
  
  return {
    xp,
    wordsLearned: words.length,
    lessonsCompleted: history.length,
    streak: streakData.streak,
    level: Math.floor(xp / 100) + 1,
  };
};

// Full reset
export const resetAllData = async () => {
  const keysToRemove = Object.values(KEYS).filter(k => k !== KEYS.GROQ_API_KEY);
  await AsyncStorage.multiRemove(keysToRemove);
};
