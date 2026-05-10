import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

import HomeScreen     from '../screens/HomeScreen';
import LessonScreen   from '../screens/LessonScreen';
import DrillScreen    from '../screens/DrillScreen';
import ReviewScreen   from '../screens/ReviewScreen';
import ChatScreen     from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: 'Home',   label: 'בית',    emoji: '🏠' },
  { name: 'Drill',  label: 'אימון',  emoji: '⚡' },
  { name: 'Chat',   label: 'שיחה',   emoji: '💬' },
  { name: 'Review', label: 'חזרה',   emoji: '🔄' },
];

function TabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const tab = TAB_CONFIG.find(t => t.name === route.name);
        const focused = state.index === index;

        return (
          <View
            key={route.key}
            style={[styles.tabItem, focused && styles.tabItemActive]}
            onTouchEnd={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <Text style={styles.tabEmoji}>{tab?.emoji}</Text>
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
              {tab?.label}
            </Text>
            {focused && <View style={styles.tabDot} />}
          </View>
        );
      })}
    </View>
  );
}

function MainTabs({ onReset }) {
  return (
    <Tab.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"   component={HomeScreen} />
      <Tab.Screen name="Drill"  component={DrillScreen} />
      <Tab.Screen name="Chat"   component={ChatScreen} />
      <Tab.Screen name="Review" component={ReviewScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ onReset }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="MainTabs">
        {props => <MainTabs {...props} onReset={onReset} />}
      </Stack.Screen>
      <Stack.Screen name="Home"     component={HomeScreen} />
      <Stack.Screen name="Lesson"   component={LessonScreen} />
      <Stack.Screen name="Drill"    component={DrillScreen} />
      <Stack.Screen name="Review"   component={ReviewScreen} />
      <Stack.Screen name="Chat"     component={ChatScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
    paddingBottom: 20,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, borderRadius: 12, position: 'relative',
  },
  tabItemActive: { backgroundColor: COLORS.primary + '15' },
  tabEmoji: { fontSize: 22, marginBottom: 2 },
  tabLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  tabLabelActive: { color: COLORS.primary },
  tabDot: {
    position: 'absolute', bottom: 2,
    width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary,
  },
});
