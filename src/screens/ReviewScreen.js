import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../utils/theme';
import { GradientButton, AnswerOption, ProgressBar, XPChip } from '../components/UIComponents';
import { generateReviewSession } from '../services/groqService';
import { getMistakesBank, getUserLevel, addXP, removeFromMistakesBank } from '../services/storage';

export default function ReviewScreen({ navigation }) {
  const [phase, setPhase] = useState('loading');
  const [session, setSession] = useState(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const animateIn = () => {
    fadeAnim.setValue(0); scaleAnim.setValue(0.95);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 120, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => { loadSession(); }, []);

  const loadSession = async () => {
    setPhase('loading');
    try {
      const [mistakes, level] = await Promise.all([getMistakesBank(), getUserLevel()]);
      if (mistakes.length === 0) { setPhase('empty'); return; }
      const sessionData = await generateReviewSession(mistakes, level?.code || 'B1');
      setSession(sessionData);
      setPhase('session');
      animateIn();
    } catch (err) {
      setError('שגיאה בטעינת החזרה');
      setPhase('error');
    }
  };

  const checkAnswer = (exercise, answer) => {
    const correct = exercise.correctAnswer.toLowerCase().trim();
    const given = (answer || '').toLowerCase().trim();
    return correct === given || given.includes(correct) || correct.includes(given);
  };

  const handleAnswer = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
  };

  const handleNext = async () => {
    const exercise = session.exercises[exerciseIndex];
    const isCorrect = checkAnswer(exercise, selectedAnswer || textAnswer);
    const xp = isCorrect ? (exercise.xpReward || 15) : 0;

    if (isCorrect) {
      setCorrectCount(c => c + 1);
      setTotalXP(t => t + xp);
      await addXP(xp);
      // Remove from mistakes bank if answered correctly
      if (exercise.id) await removeFromMistakesBank(exercise.id);
    }

    if (exerciseIndex + 1 >= session.exercises.length) {
      setPhase('complete');
      animateIn();
    } else {
      setExerciseIndex(i => i + 1);
      setSelectedAnswer(null);
      setTextAnswer('');
      setShowResult(false);
      animateIn();
    }
  };

  const getAnswerStatus = (option, exercise) => {
    if (!showResult) return 'neutral';
    if (option === exercise.correctAnswer) return 'correct';
    if (option === selectedAnswer && option !== exercise.correctAnswer) return 'wrong';
    return 'neutral';
  };

  if (phase === 'loading') return (
    <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.center}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🔄</Text>
      <Text style={styles.loadingTitle}>מכין סשן חזרה...</Text>
      <Text style={styles.loadingSub}>מנתח את השגיאות שלך</Text>
    </LinearGradient>
  );

  if (phase === 'empty') return (
    <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.center}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🌟</Text>
      <Text style={styles.loadingTitle}>אין מה לחזור!</Text>
      <Text style={styles.loadingSub}>כל השגיאות תוקנו. תלמד שיעור חדש!</Text>
      <GradientButton title="שיעור חדש 📖" onPress={() => navigation.navigate('Lesson')} style={{ marginTop: 24 }} />
    </LinearGradient>
  );

  if (phase === 'error') return (
    <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.center}>
      <Text style={{ fontSize: 64 }}>😕</Text>
      <Text style={[styles.loadingTitle, { color: COLORS.error }]}>{error}</Text>
      <GradientButton title="נסה שוב" onPress={loadSession} style={{ marginTop: 24 }} />
    </LinearGradient>
  );

  if (phase === 'complete') {
    const pct = Math.round((correctCount / session.exercises.length) * 100);
    return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.centerContent}>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <Text style={{ fontSize: 80 }}>{pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '💪'}</Text>
            <Text style={styles.completeTitle}>סשן חזרה הושלם!</Text>
            <View style={styles.completeBadge}>
              <Text style={styles.completePct}>{pct}%</Text>
              <Text style={styles.completeLabel}>הצלחה</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}><Text style={[styles.statNum, { color: COLORS.success }]}>{correctCount}</Text><Text style={styles.statLbl}>✅ נכון</Text></View>
              <View style={styles.statItem}><Text style={[styles.statNum, { color: COLORS.error }]}>{session.exercises.length - correctCount}</Text><Text style={styles.statLbl}>❌ שגוי</Text></View>
              <View style={styles.statItem}><Text style={[styles.statNum, { color: COLORS.gold }]}>{totalXP}</Text><Text style={styles.statLbl}>⚡ XP</Text></View>
            </View>
            <GradientButton title="🏠 חזור הביתה" onPress={() => navigation.navigate('Home')} gradient={[COLORS.primary, COLORS.primaryDark]} style={{ width: '100%', marginTop: 16 }} />
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (phase === 'session' && session) {
    const exercise = session.exercises[exerciseIndex];
    const isText = exercise.type === 'translate_he' || exercise.type === 'translate_en';
    const progress = exerciseIndex / session.exercises.length;

    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>✕</Text></TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>🔄 חזרה על שגיאות</Text>
              <Text style={styles.headerSub}>{exerciseIndex + 1} / {session.exercises.length}</Text>
            </View>
            <XPChip points={exercise.xpReward || 15} />
          </View>
          <ProgressBar progress={progress} color={COLORS.accent} height={4} />

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
              <View style={styles.reviewHint}>
                <Text style={styles.hintIcon}>🎯</Text>
                <Text style={styles.hintText}>זו שגיאה שעשית קודם - הפעם תצליח!</Text>
              </View>

              <View style={styles.questionCard}>
                <Text style={styles.qType}>
                  {exercise.type === 'multiple_choice' ? '🔤 בחר תשובה' : exercise.type === 'fill_blank' ? '✏️ מלא חסר' : exercise.type === 'translate_he' ? '🇮🇱→🇬🇧 תרגם' : '🇬🇧→🇮🇱 תרגם'}
                </Text>
                <Text style={styles.questionText}>{exercise.question}</Text>
              </View>

              {isText ? (
                <View>
                  <TextInput
                    style={styles.textInput}
                    value={textAnswer}
                    onChangeText={setTextAnswer}
                    placeholder="כתוב תשובה..."
                    placeholderTextColor={COLORS.textMuted}
                    editable={!showResult}
                    autoCapitalize="none"
                  />
                  {!showResult && (
                    <GradientButton title="בדוק ✓" onPress={() => { if (textAnswer.trim()) { setSelectedAnswer(textAnswer.trim()); setShowResult(true); } }} disabled={!textAnswer.trim()} />
                  )}
                </View>
              ) : (
                exercise.options?.map((opt, i) => (
                  <AnswerOption key={i} label={opt} onPress={() => handleAnswer(opt)}
                    status={showResult ? getAnswerStatus(opt, exercise) : 'neutral'}
                    disabled={showResult} />
                ))
              )}

              {showResult && (
                <View style={[styles.resultCard, {
                  borderColor: checkAnswer(exercise, selectedAnswer || textAnswer) ? COLORS.success : COLORS.error,
                  backgroundColor: checkAnswer(exercise, selectedAnswer || textAnswer) ? COLORS.success + '15' : COLORS.error + '15',
                }]}>
                  <Text style={styles.resultEmoji}>{checkAnswer(exercise, selectedAnswer || textAnswer) ? '🎉 מצוין! תיקנת את השגיאה!' : '💡 עוד קצת...'}</Text>
                  {!checkAnswer(exercise, selectedAnswer || textAnswer) && (
                    <Text style={styles.correctAnswer}>תשובה נכונה: <Text style={{ color: COLORS.success, fontWeight: '700' }}>{exercise.correctAnswer}</Text></Text>
                  )}
                  <Text style={styles.explanation}>{exercise.explanation}</Text>
                  <GradientButton
                    title={exerciseIndex + 1 >= session.exercises.length ? "סיים 🏆" : "הבא →"}
                    onPress={handleNext}
                    gradient={checkAnswer(exercise, selectedAnswer || textAnswer) ? [COLORS.secondary, COLORS.secondaryDark] : [COLORS.primary, COLORS.primaryDark]}
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SIZES.md },
  centerContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: SIZES.md },
  loadingTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXxl, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  loadingSub: { color: COLORS.textSecondary, fontSize: SIZES.textMd, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SIZES.md, paddingTop: 50, backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { color: COLORS.textSecondary, fontSize: 22 },
  headerTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: SIZES.textMd },
  headerSub: { color: COLORS.textMuted, fontSize: SIZES.textXs },
  content: { padding: SIZES.md, paddingBottom: 40 },
  reviewHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.accent + '15', borderRadius: SIZES.radiusMd, padding: 10,
    borderWidth: 1, borderColor: COLORS.accent + '40', marginBottom: SIZES.md,
  },
  hintIcon: { fontSize: 20 },
  hintText: { color: COLORS.accent, fontSize: SIZES.textSm, fontWeight: '600', flex: 1 },
  questionCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  qType: { color: COLORS.accent, fontSize: SIZES.textXs, fontWeight: '700', marginBottom: 8 },
  questionText: { color: COLORS.textPrimary, fontSize: SIZES.textLg, fontWeight: '600', lineHeight: 28 },
  textInput: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd, padding: SIZES.md,
    color: COLORS.textPrimary, fontSize: SIZES.textMd, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SIZES.md, minHeight: 70,
  },
  resultCard: { borderRadius: SIZES.radiusLg, padding: SIZES.md, borderWidth: 1, marginTop: 8 },
  resultEmoji: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontWeight: '700', marginBottom: 6 },
  correctAnswer: { color: COLORS.textSecondary, fontSize: SIZES.textMd, marginBottom: 8 },
  explanation: { color: COLORS.textSecondary, fontSize: SIZES.textSm, lineHeight: 20 },
  completeTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXxxl, fontWeight: '900', marginVertical: SIZES.md },
  completeBadge: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: SIZES.xl,
  },
  completePct: { color: COLORS.primary, fontSize: 48, fontWeight: '900' },
  completeLabel: { color: COLORS.textSecondary, fontSize: SIZES.textSm },
  statsRow: {
    flexDirection: 'row', gap: SIZES.md, backgroundColor: COLORS.bgCard,
    borderRadius: SIZES.radiusLg, padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
    width: '100%', marginBottom: SIZES.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: SIZES.textXxl, fontWeight: '900' },
  statLbl: { color: COLORS.textSecondary, fontSize: SIZES.textXs },
});
