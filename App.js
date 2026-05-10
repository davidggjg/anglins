import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import SetupScreen    from './src/screens/SetupScreen';
import LevelTestScreen from './src/screens/LevelTestScreen';
import AppNavigator   from './src/navigation/AppNavigator';

import { getApiKey, isOnboardingDone, getUserLevel } from './src/services/storage';
import {
  addNotificationResponseListener,
  addNotificationReceivedListener,
  setupAllNotifications,
  getNotificationTime,
} from './src/services/notificationService';

// ── App state machine ─────────────────────────────────────────
// 'loading' → 'setup' → 'level_test' → 'app'
// (On revisit: 'loading' → 'app' directly)

export default function App() {
  const [appState, setAppState]   = useState('loading');
  const [resetKey, setResetKey]   = useState(0);
  const navigationRef              = useRef(null);
  const notifResponseSub           = useRef(null);
  const notifReceivedSub           = useRef(null);

  useEffect(() => {
    initApp();
    setupNotificationListeners();
    return () => {
      notifResponseSub.current?.remove();
      notifReceivedSub.current?.remove();
    };
  }, []);

  const initApp = async () => {
    try {
      const [key, onboardingDone, level] = await Promise.all([
        getApiKey(),
        isOnboardingDone(),
        getUserLevel(),
      ]);

      if (!key) {
        setAppState('setup');
      } else if (!onboardingDone || !level) {
        setAppState('level_test');
      } else {
        setAppState('app');
        // Re-schedule notifications in case they were cleared
        const notifTime = await getNotificationTime();
        setupAllNotifications(notifTime.hour, notifTime.minute).catch(() => {});
      }
    } catch (err) {
      setAppState('setup'); // safe fallback
    }
  };

  const setupNotificationListeners = () => {
    // User tapped a notification
    notifResponseSub.current = addNotificationResponseListener(response => {
      const type = response.notification.request.content.data?.type;
      if (type === 'daily_reminder' || type === 'streak_warning') {
        // Navigate to lesson when app is open
        setTimeout(() => {
          navigationRef.current?.navigate('Lesson');
        }, 500);
      }
    });

    // Notification received while app is in foreground
    notifReceivedSub.current = addNotificationReceivedListener(notification => {
      // Could show an in-app banner here
      console.log('Notification received:', notification.request.content.title);
    });
  };

  const handleSetupComplete = () => {
    setAppState('level_test');
  };

  const handleLevelTestComplete = (level) => {
    setAppState('app');
    setupAllNotifications(19, 0).catch(() => {}); // Set default 7 PM reminder
  };

  const handleReset = () => {
    setResetKey(k => k + 1);
    setAppState('level_test');
  };

  if (appState === 'loading') {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
        <Text style={styles.splashEmoji}>🎓</Text>
        <Text style={styles.splashTitle}>English Master</Text>
        <Text style={styles.splashSub}>AI-Powered Learning</Text>
      </View>
    );
  }

  if (appState === 'setup') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
        <SetupScreen onSetupComplete={handleSetupComplete} />
      </SafeAreaProvider>
    );
  }

  if (appState === 'level_test') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
        <LevelTestScreen onComplete={handleLevelTestComplete} />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
        <NavigationContainer ref={navigationRef}>
          <AppNavigator key={resetKey} onReset={handleReset} />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: '#0A0E1A',
    alignItems: 'center', justifyContent: 'center',
  },
  splashEmoji: { fontSize: 80, marginBottom: 16 },
  splashTitle: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  splashSub:   { color: '#6C63FF', fontSize: 14, marginTop: 6, letterSpacing: 2 },
});
