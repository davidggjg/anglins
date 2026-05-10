import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../utils/theme';
import { GradientButton, AnswerOption, ProgressBar, Badge } from '../components/UIComponents';
import { generateLevelTestQuestion, calculateLevel } from '../services/groqService';
import { saveUserLevel, setOnboardingDone } from '../services/storage';

const TOTAL_QUESTIONS = 8;

export default function LevelTestScreen({ onComplete }) {
  const [phase, setPhase] = useState('intro'); // intro | testing | result
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [finalLevel, setFinalLevel] = useState(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 120, useNativeDriver: true }),
    ]).start();
  };

  const loadQuestion = async (index) => {
    setLoading(true);
    setError('');
    setSelectedAnswer(null);
    setShowResult(false);
    try {
      const q = await generateLevelTestQuestion(index, answers);
      setCurrentQuestion(q);
      fadeIn();
    } catch (err) {
      setError('שגיאה בטעינת שאלה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const startTest = () => {
    setPhase('testing');
    loadQuestion(0);
  };

  const handleAnswer = (answer) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    setShowResult(true);
  };

  const handleNext = () => {
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const newAnswers = [...answers, {
      question: currentQuestion.question,
      correct: isCorrect,
      difficulty: currentQuestion.difficulty,
      userAnswer: selectedAnswer,
      correctAnswer: currentQuestion.correctAnswer,
    }];
    setAnswers(newAnswers);

    if (questionIndex + 1 >= TOTAL_QUESTIONS) {
      // Calculate level
      const level = calculateLevel(newAnswers);
      setFinalLevel(level);
      setPhase('result');
    } else {
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      loadQuestion(nextIndex);
    }
  };

  const handleFinish = async () => {
    await saveUserLevel(finalLevel);
    await setOnboardingDone();
    onComplete(finalLevel);
  };

  const getAnswerStatus = (option) => {
    if (!showResult) return 'neutral';
    if (option === currentQuestion.correctAnswer) return 'correct';
    if (option === selectedAnswer && option !== currentQuestion.correctAnswer) return 'wrong';
    return 'neutral';
  };

  const LEVEL_COLOR = { A1: '#00D4AA', A2: '#54A0FF', B1: '#6C63FF', B2: '#FF9F43', C1: '#FF6B35', C2: '#FFD700' };

  if (phase === 'intro') {
    return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.introHeader}>
            <Text style={styles.bigEmoji}>🎯</Text>
            <Text style={styles.introTitle}>בואו נגלה את הרמה שלך!</Text>
            <Text style={styles.introSubtitle}>
              8 שאלות קצרות יעזרו לנו להתאים את הלימוד בדיוק בשבילך
            </Text>
          </View>

          <View style={styles.infoCard}>
            {[
              { icon: '⏱️', text: 'לוקח רק 3-5 דקות' },
              { icon: '🤖', text: 'השאלות מותאמות לך בזמן אמת' },
              { icon: '📊', text: 'תקבל ניתוח מפורט של הרמה שלך' },
              { icon: '🎓', text: 'הלמידה מתחילה מיד אחרי!' },
            ].map((item, i) => (
              <View key={i} style={styles.infoRow}>
                <Text style={styles.infoIcon}>{item.icon}</Text>
                <Text style={styles.infoText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.levelsCard}>
            <Text style={styles.levelsTitle}>רמות אפשריות:</Text>
            <View style={styles.levelsGrid}>
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                <View key={lvl} style={[styles.levelBadge, { borderColor: LEVEL_COLOR[lvl] + '80', backgroundColor: LEVEL_COLOR[lvl] + '15' }]}>
                  <Text style={[styles.levelBadgeText, { color: LEVEL_COLOR[lvl] }]}>{lvl}</Text>
                </View>
              ))}
            </View>
          </View>

          <GradientButton
            title="🚀 התחל את הבדיקה!"
            onPress={startTest}
            gradient={[COLORS.primary, '#8B5CF6']}
            style={{ marginTop: SIZES.md }}
          />

          <TouchableOpacity onPress={() => {
            const defaultLevel = { code: 'A2', score: 40, description: 'בסיסי - Elementary' };
            handleFinish(); setFinalLevel(defaultLevel);
          }} style={styles.skipBtn}>
            <Text style={styles.skipText}>דלג - אני יודע שאני מתחיל</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (phase === 'result') {
    return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.resultHeader}>
            <Text style={styles.trophyEmoji}>🏆</Text>
            <Text style={styles.resultTitle}>הרמה שלך נקבעה!</Text>

            <View style={[styles.levelDisplay, { borderColor: LEVEL_COLOR[finalLevel?.code] }]}>
              <LinearGradient
                colors={[LEVEL_COLOR[finalLevel?.code] + '30', LEVEL_COLOR[finalLevel?.code] + '10']}
                style={styles.levelDisplayInner}
              >
                <Text style={[styles.levelCode, { color: LEVEL_COLOR[finalLevel?.code] }]}>
                  {finalLevel?.code}
                </Text>
                <Text style={styles.levelDesc}>{finalLevel?.description}</Text>
              </LinearGradient>
            </View>

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>ציון:</Text>
              <Text style={styles.scoreValue}>{finalLevel?.score}%</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>סיכום הבדיקה:</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{answers.filter(a => a.correct).length}</Text>
                <Text style={styles.statLbl}>✅ נכון</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: COLORS.error }]}>{answers.filter(a => !a.correct).length}</Text>
                <Text style={styles.statLbl}>❌ שגוי</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: COLORS.gold }]}>{TOTAL_QUESTIONS}</Text>
                <Text style={styles.statLbl}>📝 סה״כ</Text>
              </View>
            </View>
          </View>

          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsTitle}>מה עכשיו?</Text>
            <Text style={styles.nextStepsText}>
              נבנה לך תוכנית לימוד מותאמת אישית לרמה {finalLevel?.code}.
              {'\n'}תלמד מילים חדשות, דקדוק, ותתרגל שיחות - הכל מותאם לך! 🎯
            </Text>
          </View>

          <GradientButton
            title="🎓 התחל ללמוד!"
            onPress={handleFinish}
            gradient={[COLORS.secondary, COLORS.secondaryDark]}
            style={{ marginTop: SIZES.md }}
          />
        </ScrollView>
      </LinearGradient>
    );
  }

  // Testing phase
  return (
    <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
      <View style={styles.testHeader}>
        <View style={styles.progressRow}>
          <Text style={styles.questionCount}>שאלה {questionIndex + 1}/{TOTAL_QUESTIONS}</Text>
          {currentQuestion && (
            <Badge
              label={currentQuestion.difficulty}
              color={LEVEL_COLOR[currentQuestion.difficulty] || COLORS.primary}
            />
          )}
        </View>
        <ProgressBar
          progress={(questionIndex) / TOTAL_QUESTIONS}
          color={COLORS.primary}
          height={6}
          style={{ marginTop: 8 }}
        />
      </View>

      <ScrollView style={styles.testContent} contentContainerStyle={{ padding: SIZES.md }}>
        {loading ? (
          <View style={styles.loadingArea}>
            <Text style={styles.loadingEmoji}>🤔</Text>
            <Text style={styles.loadingText}>מכין שאלה מותאמת לך...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorArea}>
            <Text style={styles.errorText}>{error}</Text>
            <GradientButton title="נסה שוב" onPress={() => loadQuestion(questionIndex)} style={{ marginTop: SIZES.md }} />
          </View>
        ) : currentQuestion ? (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.questionCard}>
              <Text style={styles.topicBadge}>{currentQuestion.topic}</Text>
              <Text style={styles.questionText}>{currentQuestion.question}</Text>
            </View>

            <View style={styles.answersContainer}>
              {currentQuestion.type === 'translate_he_to_en' || currentQuestion.type === 'translate_en_to_he'
                ? currentQuestion.options?.map((opt, i) => (
                  <AnswerOption
                    key={i}
                    label={opt}
                    onPress={() => handleAnswer(opt)}
                    status={showResult ? getAnswerStatus(opt) : 'neutral'}
                    disabled={showResult}
                  />
                ))
                : currentQuestion.options?.map((opt, i) => (
                  <AnswerOption
                    key={i}
                    label={opt}
                    onPress={() => handleAnswer(opt)}
                    status={showResult ? getAnswerStatus(opt) : 'neutral'}
                    disabled={showResult}
                  />
                ))
              }
            </View>

            {showResult && (
              <Animated.View style={styles.explanationCard}>
                <Text style={styles.explanationTitle}>
                  {selectedAnswer === currentQuestion.correctAnswer ? '✅ מצוין!' : '💡 הסבר:'}
                </Text>
                <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
                <GradientButton
                  title={questionIndex + 1 >= TOTAL_QUESTIONS ? "ראה תוצאות 🏆" : "שאלה הבאה →"}
                  onPress={handleNext}
                  gradient={selectedAnswer === currentQuestion.correctAnswer
                    ? [COLORS.secondary, COLORS.secondaryDark]
                    : [COLORS.primary, COLORS.primaryDark]}
                  style={{ marginTop: SIZES.md }}
                />
              </Animated.View>
            )}
          </Animated.View>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SIZES.md, paddingTop: 60, paddingBottom: 40 },
  introHeader: { alignItems: 'center', marginBottom: SIZES.xl },
  bigEmoji: { fontSize: 80, marginBottom: SIZES.md },
  introTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXxl, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  introSubtitle: { color: COLORS.textSecondary, fontSize: SIZES.textMd, textAlign: 'center', lineHeight: 24 },
  infoCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoIcon: { fontSize: 22, marginRight: 12, width: 32 },
  infoText: { color: COLORS.textSecondary, fontSize: SIZES.textMd, flex: 1 },
  levelsCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  levelsTitle: { color: COLORS.textPrimary, fontWeight: '600', marginBottom: 12, fontSize: SIZES.textMd },
  levelsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelBadge: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: SIZES.radiusFull, borderWidth: 1,
  },
  levelBadgeText: { fontWeight: '700', fontSize: SIZES.textSm },
  skipBtn: { alignItems: 'center', padding: SIZES.md, marginTop: 8 },
  skipText: { color: COLORS.textMuted, fontSize: SIZES.textSm, textDecorationLine: 'underline' },
  // Test
  testHeader: { padding: SIZES.md, paddingTop: 50, backgroundColor: COLORS.bgCard },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questionCount: { color: COLORS.textSecondary, fontSize: SIZES.textSm, fontWeight: '600' },
  testContent: { flex: 1 },
  loadingArea: { alignItems: 'center', padding: SIZES.xxl },
  loadingEmoji: { fontSize: 60, marginBottom: SIZES.md },
  loadingText: { color: COLORS.textSecondary, fontSize: SIZES.textLg },
  errorArea: { padding: SIZES.md },
  errorText: { color: COLORS.error, textAlign: 'center' },
  questionCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  topicBadge: { color: COLORS.primary, fontSize: SIZES.textXs, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  questionText: { color: COLORS.textPrimary, fontSize: SIZES.textLg, fontWeight: '600', lineHeight: 28 },
  answersContainer: { marginBottom: SIZES.md },
  explanationCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  explanationTitle: { color: COLORS.textPrimary, fontSize: SIZES.textLg, fontWeight: '700', marginBottom: 8 },
  explanationText: { color: COLORS.textSecondary, fontSize: SIZES.textMd, lineHeight: 24 },
  // Result
  resultHeader: { alignItems: 'center', marginBottom: SIZES.xl },
  trophyEmoji: { fontSize: 80, marginBottom: SIZES.md },
  resultTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXxl, fontWeight: '800', marginBottom: SIZES.md },
  levelDisplay: {
    borderRadius: SIZES.radiusLg, borderWidth: 2, overflow: 'hidden', width: '100%', marginBottom: SIZES.md,
  },
  levelDisplayInner: { padding: SIZES.xl, alignItems: 'center' },
  levelCode: { fontSize: 72, fontWeight: '900', letterSpacing: -2 },
  levelDesc: { color: COLORS.textPrimary, fontSize: SIZES.textLg, marginTop: 4, fontWeight: '600' },
  scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreLabel: { color: COLORS.textSecondary, fontSize: SIZES.textLg },
  scoreValue: { color: COLORS.gold, fontSize: SIZES.textXl, fontWeight: '800' },
  statsCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  statsTitle: { color: COLORS.textPrimary, fontWeight: '700', marginBottom: SIZES.md, fontSize: SIZES.textMd },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNum: { color: COLORS.success, fontSize: SIZES.textXxl, fontWeight: '800' },
  statLbl: { color: COLORS.textSecondary, fontSize: SIZES.textSm, marginTop: 4 },
  nextStepsCard: {
    backgroundColor: COLORS.primary + '15', borderRadius: SIZES.radiusLg, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  nextStepsTitle: { color: COLORS.primary, fontSize: SIZES.textLg, fontWeight: '700', marginBottom: 8 },
  nextStepsText: { color: COLORS.textSecondary, fontSize: SIZES.textMd, lineHeight: 24 },
});
