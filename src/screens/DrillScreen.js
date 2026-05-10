import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Dimensions, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../utils/theme';
import { GradientButton, AnswerOption, ProgressBar, XPChip, Card, Badge } from '../components/UIComponents';
import {
  DRILL_TYPES, TOPIC_CATEGORIES, generateDrillBatch,
  buildMegaSession, getAdaptedLevel, evaluateWriting,
} from '../services/drillEngine';
import { getUserLevel, addXP, addToMistakesBank, getUserStats } from '../services/storage';

const { width } = Dimensions.get('window');

// ── Focus options ────────────────────────────────────────────────
const FOCUS_OPTIONS = [
  { id: 'balanced',    label: 'מאוזן',      emoji: '⚖️',  color: COLORS.primary },
  { id: 'grammar',     label: 'דקדוק',      emoji: '📐',  color: COLORS.secondary },
  { id: 'vocabulary',  label: 'אוצר מילים', emoji: '📖',  color: COLORS.accent },
  { id: 'translation', label: 'תרגום',      emoji: '🔄',  color: '#54A0FF' },
  { id: 'reading',     label: 'קריאה',      emoji: '📚',  color: '#FF9F43' },
  { id: 'writing',     label: 'כתיבה',      emoji: '✍️',  color: '#00D4AA' },
];

export default function DrillScreen({ navigation }) {
  const [screen, setScreen] = useState('menu');  // menu | focus | topic | drilling | results | writing_eval
  const [userLevel, setUserLevel] = useState('B1');
  const [adaptedLevel, setAdaptedLevel] = useState('B1');
  const [selectedFocus, setSelectedFocus] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedDrillType, setSelectedDrillType] = useState(null);

  // Session state
  const [exercises, setExercises] = useState([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [sessionXP, setSessionXP] = useState(0);
  const [writingEval, setWritingEval] = useState(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [totalExercisesDone, setTotalExercisesDone] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getUserLevel().then(l => {
      if (l) { setUserLevel(l.code); setAdaptedLevel(l.code); }
    });
  }, []);

  const animateIn = () => {
    fadeAnim.setValue(0); scaleAnim.setValue(0.97);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 130, useNativeDriver: true }),
    ]).start();
  };

  // ── Start a mega-session by focus ────────────────────────────
  const startFocusSession = async (focus) => {
    setSelectedFocus(focus);
    setLoading(true);
    setScreen('drilling');
    setExercises([]);
    setExerciseIndex(0);
    setSessionResults([]);
    setSessionXP(0);

    try {
      const session = await buildMegaSession(adaptedLevel, focus.id);
      setExercises(session.exercises);
      animateIn();
    } catch {
      setScreen('menu');
    } finally {
      setLoading(false);
    }
  };

  // ── Start a single-type drill ────────────────────────────────
  const startTypeDrill = async (drillType, count = 20) => {
    setSelectedDrillType(drillType);
    setLoading(true);
    setScreen('drilling');
    setExercises([]);
    setExerciseIndex(0);
    setSessionResults([]);
    setSessionXP(0);

    try {
      const batch = await generateDrillBatch(drillType.id, adaptedLevel, selectedTopic, count);
      setExercises(batch);
      animateIn();
    } catch {
      setScreen('menu');
    } finally {
      setLoading(false);
    }
  };

  // ── Answer logic ─────────────────────────────────────────────
  const checkAnswer = (ex, answer) => {
    const c = (ex.correctAnswer || '').toLowerCase().trim();
    const g = (answer || '').toLowerCase().trim();
    return c === g || g.includes(c) || c.includes(g);
  };

  const handleAnswer = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
  };

  const handleWritingSubmit = async () => {
    const ex = exercises[exerciseIndex];
    setEvalLoading(true);
    try {
      const evaluation = await evaluateWriting(ex.question, textAnswer, adaptedLevel);
      setWritingEval(evaluation);
      setScreen('writing_eval');
    } catch {
      // fallback – treat as correct if > 20 chars
      setShowResult(true);
    } finally {
      setEvalLoading(false);
    }
  };

  const handleNext = async (forcedCorrect = null) => {
    const ex = exercises[exerciseIndex];
    const isCorrect = forcedCorrect !== null
      ? forcedCorrect
      : checkAnswer(ex, selectedAnswer || textAnswer);
    const xp = isCorrect ? (ex.xpReward || 10) : 0;

    const result = { id: ex.id, correct: isCorrect, type: ex.type, difficulty: ex.difficulty };
    const newResults = [...sessionResults, result];
    setSessionResults(newResults);
    setTotalExercisesDone(t => t + 1);

    if (isCorrect) {
      setSessionXP(s => s + xp);
      await addXP(xp);
    } else {
      await addToMistakesBank({ id: ex.id, question: ex.question, correctAnswer: ex.correctAnswer, type: ex.type });
    }

    // Adaptive difficulty
    const newAdapted = getAdaptedLevel(adaptedLevel, newResults);
    setAdaptedLevel(newAdapted);

    const nextIdx = exerciseIndex + 1;

    // Auto-load more when < 5 remain
    if (nextIdx >= exercises.length - 3 && !loading) {
      loadMoreExercises(newResults);
    }

    if (nextIdx >= exercises.length) {
      setScreen('results');
      animateIn();
    } else {
      setExerciseIndex(nextIdx);
      setSelectedAnswer(null);
      setTextAnswer('');
      setShowResult(false);
      setWritingEval(null);
      setScreen('drilling');
      animateIn();
    }
  };

  const loadMoreExercises = async (currentResults) => {
    if (loading) return;
    setLoading(true);
    try {
      const typeId = selectedDrillType?.id || DRILL_TYPES[Math.floor(Math.random() * DRILL_TYPES.length)].id;
      const newLevel = getAdaptedLevel(adaptedLevel, currentResults);
      const batch = await generateDrillBatch(typeId, newLevel, null, 20);
      setExercises(prev => [...prev, ...batch]);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const getAnswerStatus = (opt, ex) => {
    if (!showResult) return 'neutral';
    if (opt === ex.correctAnswer) return 'correct';
    if (opt === selectedAnswer) return 'wrong';
    return 'neutral';
  };

  // ════════════════════════════════════════════════════════════
  //  SCREENS
  // ════════════════════════════════════════════════════════════

  // ── MENU ────────────────────────────────────────────────────
  if (screen === 'menu') return (
    <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
      <View style={styles.menuHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.menuTitle}>🎯 מרכז אימון</Text>
          <Text style={styles.menuSub}>רמה: {adaptedLevel} • {totalExercisesDone} תרגולים</Text>
        </View>
        <View style={styles.xpBubble}><Text style={styles.xpBubbleText}>⚡ {sessionXP}</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuContent}>

        {/* Quick Start */}
        <Text style={styles.sectionLabel}>⚡ התחל מיד</Text>
        <View style={styles.focusGrid}>
          {FOCUS_OPTIONS.map(f => (
            <TouchableOpacity key={f.id} style={[styles.focusCard, { borderColor: f.color + '50' }]}
              onPress={() => startFocusSession(f)} activeOpacity={0.8}>
              <LinearGradient colors={[f.color + '30', f.color + '10']} style={styles.focusCardInner}>
                <Text style={styles.focusEmoji}>{f.emoji}</Text>
                <Text style={[styles.focusLabel, { color: f.color }]}>{f.label}</Text>
                <Text style={styles.focusSub}>~50 תרגולים</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* All Drill Types */}
        <Text style={styles.sectionLabel}>📋 אימון ממוקד</Text>
        <View style={styles.drillTypesList}>
          {DRILL_TYPES.map(dt => (
            <TouchableOpacity key={dt.id} style={styles.drillTypeRow}
              onPress={() => startTypeDrill(dt, 20)} activeOpacity={0.85}>
              <Text style={styles.dtEmoji}>{dt.emoji}</Text>
              <View style={styles.dtInfo}>
                <Text style={styles.dtLabel}>{dt.label}</Text>
                <Text style={styles.dtSkill}>{dt.skill}</Text>
              </View>
              <Text style={styles.dtArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Topics */}
        <Text style={styles.sectionLabel}>🌍 לפי נושא</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TOPIC_CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} style={styles.topicCard}
              onPress={() => { setSelectedTopic(cat.topics[0]); startTypeDrill(DRILL_TYPES[0], 20); }}>
              <Text style={styles.topicEmoji}>{cat.emoji}</Text>
              <Text style={styles.topicLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ height: 80 }} />
      </ScrollView>
    </LinearGradient>
  );

  // ── DRILLING ─────────────────────────────────────────────────
  if (screen === 'drilling') {
    if (loading && exercises.length === 0) return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.center}>
        <Text style={{ fontSize: 60, marginBottom: 16 }}>⚡</Text>
        <Text style={styles.loadingTitle}>מייצר {selectedFocus ? '50' : '20'} תרגולים...</Text>
        <Text style={styles.loadingSub}>AI מותאם לרמה {adaptedLevel}</Text>
      </LinearGradient>
    );

    if (exercises.length === 0) return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.center}>
        <GradientButton title="חזור לתפריט" onPress={() => setScreen('menu')} />
      </LinearGradient>
    );

    const ex = exercises[exerciseIndex];
    if (!ex) return null;

    const isOpen = ex.type === 'translate_he' || ex.type === 'translate_en' || ex.type === 'writing_prompt';
    const isWriting = ex.type === 'writing_prompt';
    const progress = exerciseIndex / exercises.length;
    const drillInfo = DRILL_TYPES.find(d => d.id === ex.type);

    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
          {/* Header */}
          <View style={styles.drillHeader}>
            <TouchableOpacity onPress={() => setScreen('menu')}>
              <Text style={styles.backBtn}>✕</Text>
            </TouchableOpacity>
            <View style={styles.drillHeaderCenter}>
              <Text style={styles.drillHeaderType}>{drillInfo?.emoji} {drillInfo?.label}</Text>
              <Text style={styles.drillHeaderCount}>{exerciseIndex + 1} / {exercises.length} • רמה {adaptedLevel}</Text>
            </View>
            <XPChip points={ex.xpReward || 10} />
          </View>
          <ProgressBar progress={progress} color={COLORS.primary} height={4} />

          <ScrollView contentContainerStyle={styles.drillContent} keyboardShouldPersistTaps="handled">
            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>

              {/* Passage (for reading) */}
              {ex.passage && (
                <View style={styles.passageBox}>
                  <Text style={styles.passageLabel}>📖 קרא את הקטע:</Text>
                  <Text style={styles.passageText}>{ex.passage}</Text>
                </View>
              )}

              {/* Question */}
              <View style={styles.questionCard}>
                <Badge
                  label={ex.skill || 'grammar'}
                  color={
                    ex.skill === 'vocabulary' ? COLORS.accent :
                    ex.skill === 'translation' ? COLORS.secondary :
                    ex.skill === 'reading' ? '#FF9F43' :
                    ex.skill === 'writing' ? '#00D4AA' : COLORS.primary
                  }
                  style={{ marginBottom: 10 }}
                />
                <Text style={styles.questionText}>{ex.question}</Text>
              </View>

              {/* Answers */}
              {!isOpen ? (
                ex.options?.map((opt, i) => (
                  <AnswerOption key={i} label={opt} onPress={() => handleAnswer(opt)}
                    status={showResult ? getAnswerStatus(opt, ex) : 'neutral'}
                    disabled={showResult} />
                ))
              ) : (
                <View>
                  <TextInput
                    style={[styles.openInput, isWriting && { minHeight: 120 }]}
                    value={textAnswer}
                    onChangeText={setTextAnswer}
                    placeholder={isWriting ? "כתוב כאן..." : "תרגום..."}
                    placeholderTextColor={COLORS.textMuted}
                    editable={!showResult && !evalLoading}
                    multiline
                    autoCapitalize="none"
                    textAlignVertical="top"
                  />
                  {!showResult && !evalLoading && (
                    isWriting ? (
                      <GradientButton
                        title={evalLoading ? "מעריך..." : "שלח לבדיקה ✓"}
                        onPress={handleWritingSubmit}
                        disabled={textAnswer.trim().length < 10 || evalLoading}
                        loading={evalLoading}
                        gradient={[COLORS.secondary, COLORS.secondaryDark]}
                      />
                    ) : (
                      <GradientButton title="בדוק ✓" onPress={() => { if (textAnswer.trim()) { setSelectedAnswer(textAnswer.trim()); setShowResult(true); } }}
                        disabled={!textAnswer.trim()} />
                    )
                  )}
                </View>
              )}

              {/* Result card */}
              {showResult && !isWriting && (
                <View style={[styles.resultCard, {
                  borderColor: checkAnswer(ex, selectedAnswer || textAnswer) ? COLORS.success : COLORS.error,
                  backgroundColor: checkAnswer(ex, selectedAnswer || textAnswer) ? COLORS.success + '12' : COLORS.error + '12',
                }]}>
                  <Text style={styles.resultTitle}>
                    {checkAnswer(ex, selectedAnswer || textAnswer) ? '🎉 נכון!' : '💡 לא בדיוק...'}
                  </Text>
                  {!checkAnswer(ex, selectedAnswer || textAnswer) && (
                    <Text style={styles.correctAnswerLine}>
                      תשובה נכונה:{' '}
                      <Text style={{ color: COLORS.success, fontWeight: '800' }}>{ex.correctAnswer}</Text>
                    </Text>
                  )}
                  <Text style={styles.explanationText}>{ex.explanation}</Text>
                  <GradientButton
                    title="המשך →"
                    onPress={() => handleNext()}
                    gradient={checkAnswer(ex, selectedAnswer || textAnswer) ? [COLORS.secondary, COLORS.secondaryDark] : [COLORS.primary, COLORS.primaryDark]}
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

  // ── WRITING EVALUATION ───────────────────────────────────────
  if (screen === 'writing_eval' && writingEval) {
    const scoreColor = writingEval.overallScore >= 80 ? COLORS.success : writingEval.overallScore >= 60 ? COLORS.warning : COLORS.error;
    return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
        <View style={styles.drillHeader}>
          <View />
          <Text style={styles.drillHeaderType}>✍️ הערכת כתיבה</Text>
          <View />
        </View>
        <ScrollView contentContainerStyle={styles.drillContent}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNum, { color: scoreColor }]}>{writingEval.overallScore}</Text>
            <Text style={styles.gradeText}>{writingEval.grade}</Text>
          </View>

          {['grammar', 'vocabulary', 'coherence', 'taskAchievement'].map(cat => {
            const fb = writingEval.feedback[cat];
            if (!fb) return null;
            return (
              <View key={cat} style={styles.feedbackRow}>
                <Text style={styles.feedbackCat}>{cat === 'grammar' ? '📐 דקדוק' : cat === 'vocabulary' ? '📖 אוצר מילים' : cat === 'coherence' ? '🔗 קוהרנטיות' : '🎯 עמידה במטרה'}</Text>
                <ProgressBar progress={fb.score / 100} color={fb.score >= 75 ? COLORS.success : fb.score >= 50 ? COLORS.warning : COLORS.error} height={6} />
                <Text style={styles.feedbackComment}>{fb.comment}</Text>
              </View>
            );
          })}

          {writingEval.corrections?.slice(0, 3).map((c, i) => (
            <View key={i} style={styles.correctionCard}>
              <Text style={styles.correctionWrong}>✗ {c.original}</Text>
              <Text style={styles.correctionRight}>✓ {c.corrected}</Text>
              <Text style={styles.correctionExp}>{c.explanation}</Text>
            </View>
          ))}

          {writingEval.improvedVersion && (
            <View style={styles.improvedCard}>
              <Text style={styles.improvedTitle}>🌟 גרסה משופרת:</Text>
              <Text style={styles.improvedText}>{writingEval.improvedVersion}</Text>
            </View>
          )}

          <View style={styles.encouragementCard}>
            <Text style={styles.encouragementText}>{writingEval.encouragement}</Text>
          </View>

          <GradientButton title="המשך לתרגול הבא →" onPress={() => handleNext(writingEval.overallScore >= 60)}
            gradient={[COLORS.primary, COLORS.primaryDark]} style={{ marginTop: 16 }} />
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── RESULTS ──────────────────────────────────────────────────
  if (screen === 'results') {
    const correct = sessionResults.filter(r => r.correct).length;
    const pct = Math.round((correct / sessionResults.length) * 100);

    return (
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
        <ScrollView contentContainerStyle={[styles.drillContent, { alignItems: 'center', paddingTop: 60 }]}>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
            <Text style={{ fontSize: 80 }}>{pct >= 85 ? '🏆' : pct >= 65 ? '⭐' : '💪'}</Text>
            <Text style={styles.resultsTitle}>סיימת!</Text>

            <View style={[styles.scoreCircle, { borderColor: pct >= 70 ? COLORS.success : COLORS.warning, marginBottom: 24 }]}>
              <Text style={[styles.scoreNum, { color: pct >= 70 ? COLORS.success : COLORS.warning }]}>{pct}%</Text>
              <Text style={styles.scoreLabel}>ציון</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.sGridItem}><Text style={[styles.sGridNum, { color: COLORS.success }]}>{correct}</Text><Text style={styles.sGridLbl}>✅ נכון</Text></View>
              <View style={styles.sGridItem}><Text style={[styles.sGridNum, { color: COLORS.error }]}>{sessionResults.length - correct}</Text><Text style={styles.sGridLbl}>❌ שגוי</Text></View>
              <View style={styles.sGridItem}><Text style={[styles.sGridNum, { color: COLORS.gold }]}>{sessionXP}</Text><Text style={styles.sGridLbl}>⚡ XP</Text></View>
              <View style={styles.sGridItem}><Text style={[styles.sGridNum, { color: COLORS.primary }]}>{adaptedLevel}</Text><Text style={styles.sGridLbl}>🎯 רמה</Text></View>
            </View>

            <Text style={styles.adaptNote}>
              {adaptedLevel !== userLevel
                ? `📈 הרמה עודכנה ל-${adaptedLevel} בהתאם לביצועים שלך!`
                : '🎯 המשך כך!'}
            </Text>

            <View style={{ width: '100%', gap: 10, marginTop: 16 }}>
              <GradientButton title="🔄 סשן חדש" onPress={() => setScreen('menu')} gradient={[COLORS.primary, COLORS.primaryDark]} />
              <GradientButton title="🏠 בית" onPress={() => navigation.navigate('Home')} gradient={[COLORS.bgCardMed, COLORS.bgCardLight]}
                textStyle={{ color: COLORS.textSecondary }} />
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
  loadingTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXxl, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  loadingSub: { color: COLORS.textSecondary, fontSize: SIZES.textMd, textAlign: 'center' },

  // Menu
  menuHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SIZES.md, paddingTop: 52,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { color: COLORS.textSecondary, fontSize: 24, padding: 4 },
  menuTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXl, fontWeight: '800' },
  menuSub: { color: COLORS.textMuted, fontSize: SIZES.textXs },
  xpBubble: { backgroundColor: COLORS.gold + '20', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.gold + '50' },
  xpBubbleText: { color: COLORS.gold, fontWeight: '700', fontSize: SIZES.textSm },
  menuContent: { padding: SIZES.md },
  sectionLabel: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontWeight: '700', marginBottom: 10, marginTop: 16 },

  focusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  focusCard: { width: (width - 48) / 3, borderRadius: SIZES.radiusMd, overflow: 'hidden', borderWidth: 1 },
  focusCardInner: { padding: 12, alignItems: 'center', minHeight: 90, justifyContent: 'center' },
  focusEmoji: { fontSize: 28, marginBottom: 4 },
  focusLabel: { fontSize: SIZES.textSm, fontWeight: '700', textAlign: 'center' },
  focusSub: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },

  drillTypesList: { backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 8 },
  drillTypeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dtEmoji: { fontSize: 22, width: 36 },
  dtInfo: { flex: 1 },
  dtLabel: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontWeight: '600' },
  dtSkill: { color: COLORS.textMuted, fontSize: SIZES.textXs, marginTop: 2 },
  dtArrow: { color: COLORS.textMuted, fontSize: 18 },

  topicCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd, padding: 14,
    alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: COLORS.border, minWidth: 90,
  },
  topicEmoji: { fontSize: 28, marginBottom: 4 },
  topicLabel: { color: COLORS.textSecondary, fontSize: SIZES.textXs, textAlign: 'center' },

  // Drill
  drillHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SIZES.md, paddingTop: 50, backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  drillHeaderCenter: { alignItems: 'center' },
  drillHeaderType: { color: COLORS.textPrimary, fontWeight: '700', fontSize: SIZES.textMd },
  drillHeaderCount: { color: COLORS.textMuted, fontSize: SIZES.textXs },
  drillContent: { padding: SIZES.md, paddingBottom: 40 },

  passageBox: {
    backgroundColor: COLORS.bgCardMed, borderRadius: SIZES.radiusMd, padding: 14,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.secondary,
    borderWidth: 1, borderColor: COLORS.border,
  },
  passageLabel: { color: COLORS.secondary, fontSize: SIZES.textXs, fontWeight: '700', marginBottom: 6 },
  passageText: { color: COLORS.textSecondary, fontSize: SIZES.textSm, lineHeight: 22 },

  questionCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  questionText: { color: COLORS.textPrimary, fontSize: SIZES.textLg, fontWeight: '600', lineHeight: 28 },

  openInput: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd, padding: SIZES.md,
    color: COLORS.textPrimary, fontSize: SIZES.textMd, borderWidth: 1, borderColor: COLORS.border,
    minHeight: 70, marginBottom: SIZES.md, textAlignVertical: 'top',
  },
  resultCard: { borderRadius: SIZES.radiusLg, padding: SIZES.md, borderWidth: 1.5, marginTop: 4 },
  resultTitle: { color: COLORS.textPrimary, fontSize: SIZES.textLg, fontWeight: '800', marginBottom: 6 },
  correctAnswerLine: { color: COLORS.textSecondary, fontSize: SIZES.textMd, marginBottom: 8 },
  explanationText: { color: COLORS.textSecondary, fontSize: SIZES.textSm, lineHeight: 20 },

  // Writing eval
  scoreCircle: {
    width: 130, height: 130, borderRadius: 65, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard, alignSelf: 'center', marginBottom: 20,
  },
  scoreNum: { fontSize: 44, fontWeight: '900' },
  gradeText: { color: COLORS.textSecondary, fontSize: SIZES.textSm },
  scoreLabel: { color: COLORS.textSecondary, fontSize: SIZES.textSm },

  feedbackRow: { backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusMd, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  feedbackCat: { color: COLORS.textPrimary, fontWeight: '700', marginBottom: 8, fontSize: SIZES.textMd },
  feedbackComment: { color: COLORS.textSecondary, fontSize: SIZES.textSm, marginTop: 6, lineHeight: 18 },

  correctionCard: { backgroundColor: COLORS.error + '10', borderRadius: SIZES.radiusMd, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.error + '30' },
  correctionWrong: { color: COLORS.error, fontSize: SIZES.textSm, marginBottom: 4 },
  correctionRight: { color: COLORS.success, fontSize: SIZES.textSm, fontWeight: '700', marginBottom: 4 },
  correctionExp: { color: COLORS.textMuted, fontSize: SIZES.textXs },

  improvedCard: { backgroundColor: COLORS.success + '10', borderRadius: SIZES.radiusMd, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.success + '30' },
  improvedTitle: { color: COLORS.success, fontWeight: '700', marginBottom: 8 },
  improvedText: { color: COLORS.textSecondary, fontSize: SIZES.textSm, lineHeight: 20 },

  encouragementCard: { backgroundColor: COLORS.primary + '15', borderRadius: SIZES.radiusMd, padding: 14, borderWidth: 1, borderColor: COLORS.primary + '30' },
  encouragementText: { color: COLORS.textPrimary, fontSize: SIZES.textMd, lineHeight: 22, textAlign: 'center' },

  // Results
  resultsTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXxxl, fontWeight: '900', marginVertical: SIZES.md },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border, width: '100%', marginBottom: SIZES.md,
  },
  sGridItem: { width: '45%', alignItems: 'center', padding: 8 },
  sGridNum: { fontSize: SIZES.textXxl, fontWeight: '900' },
  sGridLbl: { color: COLORS.textSecondary, fontSize: SIZES.textXs, marginTop: 2 },
  adaptNote: { color: COLORS.textSecondary, fontSize: SIZES.textSm, textAlign: 'center', fontStyle: 'italic', marginBottom: SIZES.md },
});
