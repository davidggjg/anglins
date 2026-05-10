import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../utils/theme';

const { width } = Dimensions.get('window');

// ─── GradientButton ──────────────────────────────────────────────────
export const GradientButton = ({ title, onPress, gradient, style, textStyle, disabled, loading, icon }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradient || [COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBtn, disabled && styles.disabledBtn, style]}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textPrimary} size="small" />
          ) : (
            <View style={styles.btnInner}>
              {icon && <Text style={styles.btnIcon}>{icon}</Text>}
              <Text style={[styles.gradientBtnText, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────
export const Card = ({ children, style, onPress, glow }) => {
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.card, glow && SHADOWS.glow, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return (
    <View style={[styles.card, glow && SHADOWS.glow, style]}>
      {children}
    </View>
  );
};

// ─── Badge ─────────────────────────────────────────────────────────────
export const Badge = ({ label, color, style }) => (
  <View style={[styles.badge, { backgroundColor: color + '30', borderColor: color }, style]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

// ─── ProgressBar ─────────────────────────────────────────────────────
export const ProgressBar = ({ progress, color, height = 8, style }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(1, Math.max(0, progress)),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={[styles.progressTrack, { height }, style]}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            height,
            backgroundColor: color || COLORS.primary,
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

// ─── XP Chip ──────────────────────────────────────────────────────────
export const XPChip = ({ points }) => (
  <View style={styles.xpChip}>
    <Text style={styles.xpChipText}>+{points} XP ⚡</Text>
  </View>
);

// ─── EmptyState ──────────────────────────────────────────────────────
export const EmptyState = ({ emoji, title, subtitle, action }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyEmoji}>{emoji}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {action}
  </View>
);

// ─── AnswerOption ────────────────────────────────────────────────────
export const AnswerOption = ({ label, onPress, status, disabled }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const getBgColor = () => {
    if (status === 'correct') return COLORS.success + '20';
    if (status === 'wrong') return COLORS.error + '20';
    return COLORS.bgCardLight;
  };

  const getBorderColor = () => {
    if (status === 'correct') return COLORS.success;
    if (status === 'wrong') return COLORS.error;
    return COLORS.border;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.85}
        style={[
          styles.answerOption,
          { backgroundColor: getBgColor(), borderColor: getBorderColor() },
        ]}
      >
        <Text style={styles.answerText}>{label}</Text>
        {status === 'correct' && <Text style={styles.answerIcon}>✅</Text>}
        {status === 'wrong' && <Text style={styles.answerIcon}>❌</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── StatCard ────────────────────────────────────────────────────────
export const StatCard = ({ icon, value, label, color }) => (
  <View style={[styles.statCard, { borderColor: color + '40' }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gradientBtn: {
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    ...SHADOWS.md,
  },
  disabledBtn: { opacity: 0.5 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnIcon: { fontSize: 20 },
  gradientBtnText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMd,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: SIZES.textXs, fontWeight: '700', letterSpacing: 0.5 },
  progressTrack: {
    backgroundColor: COLORS.bgCardMed,
    borderRadius: SIZES.radiusFull,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: { borderRadius: SIZES.radiusFull },
  xpChip: {
    backgroundColor: COLORS.gold + '25',
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.gold + '60',
  },
  xpChipText: { color: COLORS.gold, fontSize: SIZES.textSm, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: SIZES.xxl },
  emptyEmoji: { fontSize: 64, marginBottom: SIZES.md },
  emptyTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXl, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { color: COLORS.textSecondary, fontSize: SIZES.textMd, textAlign: 'center', lineHeight: 22 },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  answerText: { color: COLORS.textPrimary, fontSize: SIZES.textMd, flex: 1, fontWeight: '500' },
  answerIcon: { fontSize: 18 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: (width - 60) / 2,
  },
  statIcon: { fontSize: 28, marginBottom: 6 },
  statValue: { fontSize: SIZES.textXl, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: COLORS.textSecondary, fontSize: SIZES.textSm, textAlign: 'center' },
});
