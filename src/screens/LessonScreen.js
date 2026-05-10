import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../utils/theme';
import { GradientButton, AnswerOption, ProgressBar, XPChip, Badge } from '../components/UIComponents';
import { generateDailyLesson } from '../services/groqService';
import { getUserLevel, getWordsLearned, addWordLearned, addXP, saveLessonResult, addToMistakesBank, updateStreak } from '../services/storage';

export default function LessonScreen({ navigation }) {
  const [phase, setPhase] = useState('loading'); // loading | vocabulary | grammar | exercises | complete
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState('');
  const [vocabIndex, setVocabIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [results, setResults] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const animateIn = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 120, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    loadLesson();
  }, []);

  const loadLesson = async () => {
    setPhase('loading');
    setError('');
    try {
      const [level, wordsLearned] = await Promise.all([
        getUserLevel(),
        getWordsLearned(),
      ]);
      const lessonData = await generateDailyLesson(level?.code || 'B1', wordsLearned);
      setLesson(lessonData);
      setPhase('vocabulary');
      animateIn();
    } catch (err) {
      setError(err.message === 'NO_API_KEY' ? 'לא נמצא מפתח API' : 'שגיאה בטעינת השיעור. בדוק אינטרנט ונסה שוב.');
      setPhase('error');
    }
  };

  const handleVocabNext = async () => {
    // Save word as learned
    if (lesson?.vocabulary[vocabIndex]) {
      await addWordLearned(lesson.vocabulary[vocabIndex]);
    }

    if (vocabIndex + 1 >= lesson.vocabulary.length) {
      setPhase('grammar');
      animateIn();
    } else {
      setVocabIndex(prev => prev + 1);
      setShowTranslation(false);
      animateIn();
    }
  };

  const handleExerciseAnswer = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
  };

  const handleTextSubmit = () => {
    if (!textAnswer.trim()) return;
    setShowResult(true);
    setSelectedAnswer(textAnswer.trim());
  };

  const handleExerciseNext = async () => {
    const exercise = lesson.exercises[exerciseIndex];
    const isCorrect = checkAnswer(exercise, selectedAnswer || textAnswer);
    const xpEarned = isCorrect ? (exercise.xpReward || 10) : 0;

    const newResult = { exerciseId: exercise.id, correct: isCorrect, xp: xpEarned };
    const newResults = [...results, newResult];
    setResults(newResults);

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setTotalXP(prev => prev + xpEarned);
      await addXP(xpEarned);
    } else {
      await addToMistakesBank({
        id: exercise.id,
        question: exercise.question,
        correctAnswer: exercise.correctAnswer,
        type: exercise.type,
        lessonTopic: lesson.topicEn,
      });
    }

    if (exerciseIndex + 1 >= lesson.exercises.length) {
      // Complete lesson
      const totalCorrect = newResults.filter(r => r.correct).length;
      const totalXPearned = newResults.reduce((sum, r) => sum + r.xp, 0);

      // Bonus XP for perfect score
      if (totalCorrect === lesson.exercises.length) {
        await addXP(50);
        setTotalXP(prev => prev + 50);
      }

      await updateStreak();
      await saveLessonResult({
        lessonTitle: lesson.lessonTitle,
        topic: lesson.topicEn,
        correct: totalCorrect,
        total: lesson.exercises.length,
        xp: totalXPearned,
      });

      setPhase('complete');
      animateIn();
    } else {
      setExerciseIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setTextAnswer('');
      setShowResult(false);
      animateIn();
    }
  };

  const checkAnswer = (exercise, answer) => {
    const correct = exercise.correctAnswer.toLowerCase().trim();
    const given = (answer || '').toLowerCase().trim();
    return correct === given || given.includes(correct) || correct.includes(given);
  };

  const getAnswerStatus = (option, exercise) => {
    if (!showResult) return 'neutral';
    if (option === exercise.correctAnswer) return 'correct';
    if (option === selectedAnswer && option !== exercise.correctAnswer) return 'wrong';
    return 'neutral';
  };

  // ── Loading ──
  if (phase === 'loading') {
    return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.center}>
        <Text style={styles.loadingEmoji}>📚</Text>
        <Text style={styles.loadingTitle}>מכין שיעור מיוחד לך...</Text>
        <Text style={styles.loadingSubtitle}>ה-AI בונה תוכן מותאם לרמה שלך</Text>
        <View style={styles.loadingDots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, { opacity: 0.3 + i * 0.3 }]} />
          ))}
        </View>
      </LinearGradient>
    );
  }

  // ── Error ──
  if (phase === 'error') {
    return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.center}>
        <Text style={{ fontSize: 60 }}>😕</Text>
        <Text style={styles.loadingTitle}>אופס!</Text>
        <Text style={[styles.loadingSubtitle, { color: COLORS.error, marginBottom: SIZES.xl }]}>{error}</Text>
        <GradientButton title="נסה שוב 🔄" onPress={loadLesson} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: SIZES.md }}>
          <Text style={{ color: COLORS.textMuted }}>חזור</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // ── Vocabulary Phase ──
  if (phase === 'vocabulary' && lesson) {
    const word = lesson.vocabulary[vocabIndex];
    const progress = vocabIndex / lesson.vocabulary.length;

    return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>📖 מילות השיעור</Text>
            <Text style={styles.headerSub}>{vocabIndex + 1} / {lesson.vocabulary.length}</Text>
          </View>
          <Badge label={lesson.topicEn} color={COLORS.primary} />
        </View>

        <ProgressBar progress={progress} color={COLORS.primary} height={4} />

        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            <View style={styles.wordCard}>
              <Text style={styles.bigWord}>{word.word}</Text>
              <Text style={styles.pronunciation}>🔊 {word.pronunciation}</Text>

              <TouchableOpacity
                onPress={() => setShowTranslation(!showTranslation)}
                style={styles.revealBtn}
              >
                <Text style={styles.revealText}>
                  {showTranslation ? word.translation : '👆 הקש לראות תרגום'}
                </Text>
              </TouchableOpacity>
            </View>

            {showTranslation && (
              <Animated.View style={{ opacity: fadeAnim }}>
                <View style={styles.exampleCard}>
                  <Text style={styles.exampleTitle}>📝 משפל לדוגמה:</Text>
                  <Text style={styles.exampleEn}>"{word.example}"</Text>
                  <Text style={styles.exampleHe}>{word.exampleHe}</Text>
                </View>

                <Badge
                  label={word.difficulty === 'easy' ? '🟢 קל' : word.difficulty === 'medium' ? '🟡 בינוני' : '🔴 קשה'}
                  color={word.difficulty === 'easy' ? COLORS.success : word.difficulty === 'medium' ? COLORS.warning : COLORS.error}
                  style={{ alignSelf: 'center', marginBottom: SIZES.md }}
                />

                <GradientButton
                  title={vocabIndex + 1 >= lesson.vocabulary.length ? "המשך לדקדוק 📚" : "הבא →"}
                  onPress={handleVocabNext}
                  gradient={[COLORS.primary, COLORS.primaryDark]}
                />
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── Grammar Phase ──
  if (phase === 'grammar' && lesson) {
    return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📐 טיפ דקדוק</Text>
          <View />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.grammarCard}>
              <Text style={styles.grammarIcon}>💡</Text>
              <Text style={styles.grammarTitle}>{lesson.grammarTip.title}</Text>
              <Text style={styles.grammarTitleHe}>{lesson.grammarTip.titleHe}</Text>
            </View>

            <View style={styles.explanationCard}>
              <Text style={styles.explanationText}>{lesson.grammarTip.explanation}</Text>
            </View>

            <View style={styles.examplesSection}>
              <Text style={styles.examplesTitle}>דוגמאות:</Text>
              {lesson.grammarTip.examples.map((ex, i) => (
                <View key={i} style={styles.exampleItem}>
                  <View style={styles.exampleDot} />
                  <View>
                    <Text style={styles.exampleEnGrammar}>{ex}</Text>
                    <Text style={styles.exampleHeGrammar}>{lesson.grammarTip.examplesHe[i]}</Text>
                  </View>
                </View>
              ))}
            </View>

            <GradientButton
              title="עכשיו לתרגול! 💪"
              onPress={() => { setPhase('exercises'); animateIn(); }}
              gradient={[COLORS.accent, COLORS.accentDark]}
              style={{ marginTop: SIZES.md }}
            />
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── Exercises Phase ──
  if (phase === 'exercises' && lesson) {
    const exercise = lesson.exercises[exerciseIndex];
    const progress = exerciseIndex / lesson.exercises.length;
    const isTranslateType = exercise.type === 'translate_he' || exercise.type === 'translate_en';

    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backBtn}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>🎯 תרגול</Text>
              <Text style={styles.headerSub}>{exerciseIndex + 1} / {lesson.exercises.length}</Text>
            </View>
            <XPChip points={exercise.xpReward || 10} />
          </View>

          <ProgressBar progress={progress} color={COLORS.accent} height={4} />

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
              <View style={styles.exerciseCard}>
                <Text style={styles.exerciseType}>
                  {exercise.type === 'multiple_choice' ? '🔤 בחר תשובה' :
                    exercise.type === 'fill_blank' ? '✏️ מלא את החסר' :
                      exercise.type === 'translate_he' ? '🇮🇱→🇬🇧 תרגם לאנגלית' :
                        exercise.type === 'translate_en' ? '🇬🇧→🇮🇱 תרגם לעברית' :
                          exercise.type === 'reorder' ? '🔀 סדר את המשפט' : '❓ שאלה'}
                </Text>
                <Text style={styles.exerciseQuestion}>{exercise.question}</Text>
              </View>

              {isTranslateType ? (
                <View style={styles.textInputArea}>
                  <TextInput
                    style={styles.translationInput}
                    value={textAnswer}
                    onChangeText={setTextAnswer}
                    placeholder="כתוב את התשובה שלך..."
                    placeholderTextColor={COLORS.textMuted}
                    editable={!showResult}
                    multiline
                    autoCapitalize="none"
                  />
                  {!showResult && (
                    <GradientButton
                      title="בדוק ✓"
                      onPress={handleTextSubmit}
                      disabled={!textAnswer.trim()}
                      gradient={[COLORS.primary, COLORS.primaryDark]}
                    />
                  )}
                </View>
              ) : (
                exercise.options?.map((opt, i) => (
                  <AnswerOption
                    key={i}
                    label={opt}
                    onPress={() => handleExerciseAnswer(opt)}
                    status={showResult ? getAnswerStatus(opt, exercise) : 'neutral'}
                    disabled={showResult}
                  />
                ))
              )}

              {showResult && (
                <Animated.View style={[styles.resultCard, {
                  borderColor: checkAnswer(exercise, selectedAnswer || textAnswer) ? COLORS.success : COLORS.error,
                  backgroundColor: checkAnswer(exercise, selectedAnswer || textAnswer) ? COLORS.success + '15' : COLORS.error + '15',
                }]}>
                  <Text style={styles.resultIcon}>
                    {checkAnswer(exercise, selectedAnswer || textAnswer) ? '🎉 מצוין!' : '💡 כמעט!'}
                  </Text>
                  {!checkAnswer(exercise, selectedAnswer || textAnswer) && (
                    <Text style={styles.correctAnswerText}>
                      תשובה נכונה: <Text style={{ color: COLORS.success, fontWeight: '700' }}>{exercise.correctAnswer}</Text>
                    </Text>
                  )}
                  <Text style={styles.explanationResultText}>{exercise.explanation}</Text>
                  <GradientButton
                    title={exerciseIndex + 1 >= lesson.exercises.length ? "סיים שיעור 🏆" : "המשך →"}
                    onPress={handleExerciseNext}
                    gradient={checkAnswer(exercise, selectedAnswer || textAnswer)
                      ? [COLORS.secondary, COLORS.secondaryDark]
                      : [COLORS.primary, COLORS.primaryDark]}
                    style={{ marginTop: SIZES.md }}
                  />
                </Animated.View>
              )}
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  // ── Complete Phase ──
  if (phase === 'complete') {
    const percentage = Math.round((correctCount / (lesson?.exercises.length || 1)) * 100);
    const isPerfect = correctCount === lesson?.exercises.length;

    return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: 60 }]}>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <Text style={{ fontSize: 80, marginBottom: SIZES.md }}>
              {isPerfect ? '🏆' : percentage >= 70 ? '⭐' : '💪'}
            </Text>

            <Text style={styles.completeTitle}>
              {isPerfect ? 'מושלם!' : percentage >= 70 ? 'כל הכבוד!' : 'המשך להתאמן!'}
            </Text>

            <LinearGradient
              colors={[COLORS.primary + '30', COLORS.primary + '10']}
              style={styles.scoreCircle}
            >
              <Text style={styles.scorePercent}>{percentage}%</Text>
              <Text style={styles.scoreLabel}>ציון</Text>
            </LinearGradient>

            <View style={styles.completeStats}>
              <View style={styles.completeStat}>
                <Text style={[styles.completeStatNum, { color: COLORS.success }]}>{correctCount}</Text>
                <Text style={styles.completeStatLabel}>✅ נכון</Text>
              </View>
              <View style={styles.completeStat}>
                <Text style={[styles.completeStatNum, { color: COLORS.error }]}>
                  {(lesson?.exercises.length || 0) - correctCount}
                </Text>
                <Text style={styles.completeStatLabel}>❌ שגוי</Text>
              </View>
              <View style={styles.completeStat}>
                <Text style={[styles.completeStatNum, { color: COLORS.gold }]}>{totalXP}{isPerfect ? '+50' : ''}</Text>
                <Text style={styles.completeStatLabel}>⚡ XP</Text>
              </View>
            </View>

            {isPerfect && (
              <View style={styles.bonusCard}>
                <Text style={styles.bonusText}>🌟 ציון מושלם! +50 XP בונוס!</Text>
              </View>
            )}

            <View style={styles.completeActions}>
              <GradientButton
                title="🏠 חזור הביתה"
                onPress={() => navigation.navigate('Home')}
                gradient={[COLORS.primary, COLORS.primaryDark]}
                style={{ flex: 1 }}
              />
              <GradientButton
                title="🔄 שיעור חדש"
                onPress={loadLesson}
                gradient={[COLORS.secondary, COLORS.secondaryDark]}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SIZES.md },
  loadingEmoji: { fontSize: 80, marginBottom: SIZES.md },
  loadingTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXxl, fontWeight: '800', marginBottom: 8 },
  loadingSubtitle: { color: COLORS.textSecondary, fontSize: SIZES.textMd, textAlign: 'center' },
  loadingDots: { flexDirection: 'row', gap: 8, marginTop: SIZES.md },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SIZES.md, paddingTop: 50, backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { color: COLORS.textSecondary, fontSize: 22 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontWeight: '700' },
  headerSub: { color: COLORS.textMuted, fontSize: SIZES.textXs },
  content: { padding: SIZES.md, paddingBottom: 40 },
  // Vocabulary
  wordCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.xl,
    alignItems: 'center', marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  bigWord: { color: COLORS.textPrimary, fontSize: 48, fontWeight: '900', textAlign: 'center', letterSpacing: -1 },
  pronunciation: { color: COLORS.textMuted, fontSize: SIZES.textMd, marginTop: 8, marginBottom: SIZES.md },
  revealBtn: {
    backgroundColor: COLORS.primary + '20', borderRadius: SIZES.radiusFull,
    paddingHorizontal: SIZES.md, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  revealText: { color: COLORS.primary, fontSize: SIZES.textMd, fontWeight: '600' },
  exampleCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    marginBottom: SIZES.md, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
    borderWidth: 1, borderColor: COLORS.border,
  },
  exampleTitle: { color: COLORS.textSecondary, fontSize: SIZES.textSm, marginBottom: 8, fontWeight: '600' },
  exampleEn: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontStyle: 'italic', marginBottom: 4 },
  exampleHe: { color: COLORS.textMuted, fontSize: SIZES.textSm },
  // Grammar
  grammarCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.xl,
    alignItems: 'center', marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.secondary + '40',
  },
  grammarIcon: { fontSize: 48, marginBottom: 12 },
  grammarTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXl, fontWeight: '800', textAlign: 'center' },
  grammarTitleHe: { color: COLORS.secondary, fontSize: SIZES.textMd, textAlign: 'center', marginTop: 4 },
  explanationCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  explanationText: { color: COLORS.textSecondary, fontSize: SIZES.textMd, lineHeight: 26 },
  examplesSection: { marginBottom: SIZES.md },
  examplesTitle: { color: COLORS.textPrimary, fontWeight: '700', marginBottom: 12, fontSize: SIZES.textMd },
  exampleItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  exampleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary, marginTop: 6 },
  exampleEnGrammar: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontWeight: '600' },
  exampleHeGrammar: { color: COLORS.textMuted, fontSize: SIZES.textSm },
  // Exercise
  exerciseCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  exerciseType: { color: COLORS.accent, fontSize: SIZES.textXs, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  exerciseQuestion: { color: COLORS.textPrimary, fontSize: SIZES.textLg, fontWeight: '600', lineHeight: 28 },
  textInputArea: { marginBottom: SIZES.md },
  translationInput: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd, padding: SIZES.md,
    color: COLORS.textPrimary, fontSize: SIZES.textMd, borderWidth: 1, borderColor: COLORS.border,
    minHeight: 80, marginBottom: SIZES.md, textAlignVertical: 'top',
  },
  resultCard: {
    borderRadius: SIZES.radiusLg, padding: SIZES.md, marginTop: SIZES.md, borderWidth: 1,
  },
  resultIcon: { color: COLORS.textPrimary, fontSize: SIZES.textLg, fontWeight: '700', marginBottom: 6 },
  correctAnswerText: { color: COLORS.textSecondary, fontSize: SIZES.textMd, marginBottom: 8 },
  explanationResultText: { color: COLORS.textSecondary, fontSize: SIZES.textSm, lineHeight: 20 },
  // Complete
  completeTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXxxl, fontWeight: '900', marginBottom: SIZES.md },
  scoreCircle: {
    width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center',
    marginBottom: SIZES.xl, borderWidth: 3, borderColor: COLORS.primary,
  },
  scorePercent: { color: COLORS.primary, fontSize: 48, fontWeight: '900' },
  scoreLabel: { color: COLORS.textSecondary, fontSize: SIZES.textSm },
  completeStats: {
    flexDirection: 'row', gap: SIZES.md, marginBottom: SIZES.md,
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border, width: '100%',
  },
  completeStat: { flex: 1, alignItems: 'center' },
  completeStatNum: { fontSize: SIZES.textXxl, fontWeight: '900' },
  completeStatLabel: { color: COLORS.textSecondary, fontSize: SIZES.textXs },
  bonusCard: {
    backgroundColor: COLORS.gold + '20', borderRadius: SIZES.radiusMd, padding: 12,
    borderWidth: 1, borderColor: COLORS.gold + '50', marginBottom: SIZES.md, width: '100%',
  },
  bonusText: { color: COLORS.gold, textAlign: 'center', fontWeight: '700', fontSize: SIZES.textMd },
  completeActions: { flexDirection: 'row', gap: 10, width: '100%' },
});
