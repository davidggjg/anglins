import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Animated, TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, LEVEL_INFO } from '../utils/theme';
import { GradientButton, Card, ProgressBar, StatCard } from '../components/UIComponents';
import { getUserProfile, getUserLevel, getUserStats, getStreak } from '../services/storage';
import { generateWordOfDay } from '../services/groqService';

const { width } = Dimensions.get('window');

const GREETINGS = {
  morning: ['בוקר טוב! ☀️', 'יום נהדר מתחיל 🌅', 'בוקר אנגלית! 📚'],
  afternoon: ['צהריים טובים! 🌤️', 'אחה"צ של לימוד! 💪', 'המשך יום מצוין! 🎯'],
  evening: ['ערב טוב! 🌙', 'זמן ללמוד! 🔥', 'סשן ערב מחכה! ⭐'],
};

const getGreeting = () => {
  const hour = new Date().getHours();
  const list = hour < 12 ? GREETINGS.morning : hour < 17 ? GREETINGS.afternoon : GREETINGS.evening;
  return list[Math.floor(Math.random() * list.length)];
};

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [level, setLevel] = useState(null);
  const [wordOfDay, setWordOfDay] = useState(null);
  const [wordLoading, setWordLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting] = useState(getGreeting());

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadData = async () => {
    try {
      const [statsData, levelData] = await Promise.all([
        getUserStats(),
        getUserLevel(),
      ]);
      setStats(statsData);
      setLevel(levelData);
    } catch (err) {
      console.error('Error loading home data:', err);
    }
  };

  const loadWordOfDay = async (userLevel) => {
    if (wordLoading) return;
    setWordLoading(true);
    try {
      const word = await generateWordOfDay(userLevel?.code || 'B1');
      setWordOfDay(word);
    } catch (err) {
      console.error('Error loading word of day:', err);
    } finally {
      setWordLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData().then(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, tension: 80, useNativeDriver: true }),
        ]).start();
      });
    }, [])
  );

  useEffect(() => {
    if (level && !wordOfDay) {
      loadWordOfDay(level);
    }
  }, [level]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (level) await loadWordOfDay(level);
    setRefreshing(false);
  };

  const levelInfo = level ? LEVEL_INFO[level.code] : LEVEL_INFO['A2'];
  const xpForNextLevel = levelInfo ? levelInfo.xpRequired + 500 : 500;
  const xpProgress = stats ? (stats.xp % 500) / 500 : 0;

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1220', '#131929']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <LinearGradient
            colors={[COLORS.primary + '30', 'transparent']}
            style={styles.header}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.headerSubtitle}>
                  {stats?.streak > 0 ? `🔥 רצף: ${stats.streak} ימים` : 'התחל את הרצף שלך!'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={styles.settingsBtn}
              >
                <Text style={styles.settingsIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>

            {/* Level Badge */}
            {level && (
              <View style={[styles.levelBadge, { borderColor: levelInfo?.color + '60' }]}>
                <Text style={styles.levelEmoji}>{levelInfo?.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelCode, { color: levelInfo?.color }]}>{level.code}</Text>
                  <Text style={styles.levelLabel}>{levelInfo?.label}</Text>
                </View>
                <View style={styles.xpInfo}>
                  <Text style={styles.xpAmount}>{stats?.xp || 0} XP</Text>
                  <ProgressBar progress={xpProgress} color={levelInfo?.color} height={4} style={{ width: 80, marginTop: 4 }} />
                </View>
              </View>
            )}
          </LinearGradient>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 למד עכשיו</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.mainAction}
                onPress={() => navigation.navigate('Lesson')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.primary, '#8B5CF6', COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.mainActionGradient}
                >
                  <Text style={styles.mainActionEmoji}>📖</Text>
                  <Text style={styles.mainActionTitle}>שיעור יומי</Text>
                  <Text style={styles.mainActionSub}>מילים + תרגול + דקדוק</Text>
                  <View style={styles.mainActionBadge}>
                    <Text style={styles.mainActionBadgeText}>+50 XP</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => navigation.navigate('Review')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[COLORS.accent + '40', COLORS.accent + '20']}
                    style={styles.secondaryActionInner}
                  >
                    <Text style={styles.secondaryEmoji}>🔄</Text>
                    <Text style={styles.secondaryTitle}>חזרה</Text>
                    <Text style={styles.secondarySub}>תקן שגיאות</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => navigation.navigate('Chat')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[COLORS.secondary + '40', COLORS.secondary + '20']}
                    style={styles.secondaryActionInner}
                  >
                    <Text style={styles.secondaryEmoji}>💬</Text>
                    <Text style={styles.secondaryTitle}>שיחה</Text>
                    <Text style={styles.secondarySub}>עם AI</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Stats */}
          {stats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 הסטטיסטיקות שלך</Text>
              <View style={styles.statsGrid}>
                <StatCard icon="🔥" value={stats.streak} label="ימי רצף" color={COLORS.accent} />
                <StatCard icon="📝" value={stats.wordsLearned} label="מילים" color={COLORS.secondary} />
                <StatCard icon="⚡" value={stats.xp} label="נקודות XP" color={COLORS.gold} />
                <StatCard icon="🎓" value={stats.lessonsCompleted} label="שיעורים" color={COLORS.primary} />
              </View>
            </View>
          )}

          {/* Word of the Day */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 מילה של היום</Text>
            {wordLoading ? (
              <Card style={styles.wordCard}>
                <View style={styles.wordLoading}>
                  <Text style={styles.wordLoadingEmoji}>🤔</Text>
                  <Text style={styles.wordLoadingText}>מחפש מילה מעניינת...</Text>
                </View>
              </Card>
            ) : wordOfDay ? (
              <Card style={styles.wordCard}>
                <View style={styles.wordHeader}>
                  <View>
                    <Text style={styles.wordText}>{wordOfDay.word}</Text>
                    <Text style={styles.wordPartOfSpeech}>{wordOfDay.partOfSpeech}</Text>
                  </View>
                  <View style={styles.pronunciationBadge}>
                    <Text style={styles.pronunciationText}>🔊 {wordOfDay.pronunciation}</Text>
                  </View>
                </View>

                <View style={styles.wordDivider} />

                <Text style={styles.wordTranslation}>🇮🇱 {wordOfDay.translation}</Text>
                <Text style={styles.wordDefinition}>📖 {wordOfDay.definitionHe}</Text>

                {wordOfDay.examples?.[0] && (
                  <View style={styles.exampleBox}>
                    <Text style={styles.exampleEn}>"{wordOfDay.examples[0].en}"</Text>
                    <Text style={styles.exampleHe}>{wordOfDay.examples[0].he}</Text>
                  </View>
                )}

                {wordOfDay.memoryTip && (
                  <View style={styles.memoryTip}>
                    <Text style={styles.memoryTipTitle}>🧠 טיפ לזכרון:</Text>
                    <Text style={styles.memoryTipText}>{wordOfDay.memoryTip}</Text>
                  </View>
                )}
              </Card>
            ) : (
              <Card style={styles.wordCard}>
                <TouchableOpacity onPress={() => loadWordOfDay(level)}>
                  <Text style={{ color: COLORS.primary, textAlign: 'center', padding: SIZES.md }}>
                    טען מילת יום ← הקש כאן
                  </Text>
                </TouchableOpacity>
              </Card>
            )}
          </View>

          {/* Motivation */}
          <View style={[styles.section, { paddingBottom: 100 }]}>
            <LinearGradient
              colors={[COLORS.secondary + '20', COLORS.secondary + '10']}
              style={styles.motivationCard}
            >
              <Text style={styles.motivationEmoji}>🌟</Text>
              <Text style={styles.motivationText}>
                "The secret of getting ahead is getting started."
              </Text>
              <Text style={styles.motivationTranslation}>
                הסוד להתקדם הוא להתחיל
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: SIZES.md, paddingTop: 55, paddingBottom: SIZES.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SIZES.md },
  greeting: { color: COLORS.textPrimary, fontSize: SIZES.textXl, fontWeight: '800' },
  headerSubtitle: { color: COLORS.textSecondary, fontSize: SIZES.textSm, marginTop: 4 },
  settingsBtn: { padding: 8, backgroundColor: COLORS.bgCard, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  settingsIcon: { fontSize: 18 },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd,
    padding: 12, borderWidth: 1, gap: 12,
  },
  levelEmoji: { fontSize: 28 },
  levelInfo: { flex: 1 },
  levelCode: { fontSize: SIZES.textXl, fontWeight: '900' },
  levelLabel: { color: COLORS.textSecondary, fontSize: SIZES.textXs },
  xpInfo: { alignItems: 'flex-end' },
  xpAmount: { color: COLORS.gold, fontSize: SIZES.textSm, fontWeight: '700' },
  section: { padding: SIZES.md, paddingBottom: 0 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: SIZES.textLg, fontWeight: '700', marginBottom: 12 },
  actionsGrid: { gap: 10 },
  mainAction: { borderRadius: SIZES.radiusLg, overflow: 'hidden' },
  mainActionGradient: { padding: SIZES.md, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 90 },
  mainActionEmoji: { fontSize: 36 },
  mainActionTitle: { color: '#FFF', fontSize: SIZES.textXl, fontWeight: '800', flex: 1 },
  mainActionSub: { color: 'rgba(255,255,255,0.7)', fontSize: SIZES.textSm },
  mainActionBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  mainActionBadgeText: { color: '#FFF', fontSize: SIZES.textSm, fontWeight: '700' },
  secondaryActions: { flexDirection: 'row', gap: 10 },
  secondaryAction: { flex: 1, borderRadius: SIZES.radiusMd, overflow: 'hidden' },
  secondaryActionInner: { padding: SIZES.md, alignItems: 'center', minHeight: 90, justifyContent: 'center' },
  secondaryEmoji: { fontSize: 28, marginBottom: 4 },
  secondaryTitle: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontWeight: '700' },
  secondarySub: { color: COLORS.textSecondary, fontSize: SIZES.textXs },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wordCard: { padding: SIZES.md },
  wordLoading: { alignItems: 'center', padding: SIZES.md },
  wordLoadingEmoji: { fontSize: 40, marginBottom: 8 },
  wordLoadingText: { color: COLORS.textSecondary },
  wordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SIZES.md },
  wordText: { color: COLORS.textPrimary, fontSize: SIZES.textXxl, fontWeight: '900' },
  wordPartOfSpeech: { color: COLORS.primary, fontSize: SIZES.textSm, fontStyle: 'italic' },
  pronunciationBadge: { backgroundColor: COLORS.bgCardLight, borderRadius: SIZES.radiusMd, padding: 8 },
  pronunciationText: { color: COLORS.textSecondary, fontSize: SIZES.textSm },
  wordDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  wordTranslation: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontWeight: '600', marginBottom: 6 },
  wordDefinition: { color: COLORS.textSecondary, fontSize: SIZES.textSm, marginBottom: 12, lineHeight: 20 },
  exampleBox: {
    backgroundColor: COLORS.primary + '15', borderRadius: SIZES.radiusMd,
    padding: 12, borderLeftWidth: 3, borderLeftColor: COLORS.primary, marginBottom: 10,
  },
  exampleEn: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontStyle: 'italic', marginBottom: 4 },
  exampleHe: { color: COLORS.textSecondary, fontSize: SIZES.textSm },
  memoryTip: {
    backgroundColor: COLORS.gold + '15', borderRadius: SIZES.radiusMd, padding: 12,
    borderWidth: 1, borderColor: COLORS.gold + '30',
  },
  memoryTipTitle: { color: COLORS.gold, fontSize: SIZES.textSm, fontWeight: '700', marginBottom: 4 },
  memoryTipText: { color: COLORS.textSecondary, fontSize: SIZES.textSm, lineHeight: 18 },
  motivationCard: { borderRadius: SIZES.radiusLg, padding: SIZES.md, alignItems: 'center', marginTop: SIZES.md },
  motivationEmoji: { fontSize: 32, marginBottom: 8 },
  motivationText: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontStyle: 'italic', textAlign: 'center', marginBottom: 4 },
  motivationTranslation: { color: COLORS.textMuted, fontSize: SIZES.textSm, textAlign: 'center' },
});
