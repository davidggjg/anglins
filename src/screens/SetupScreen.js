import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  Animated, Linking, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../utils/theme';
import { GradientButton } from '../components/UIComponents';
import { saveApiKey } from '../services/storage';
import { validateApiKey } from '../services/groqService';

export default function SetupScreen({ onSetupComplete }) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('אנא הכנס מפתח API');
      shake();
      return;
    }

    if (!apiKey.startsWith('gsk_')) {
      setError('מפתח Groq חייב להתחיל ב-gsk_');
      shake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await validateApiKey(apiKey.trim());
      if (!result.valid) {
        setError(result.error || 'מפתח לא תקין');
        shake();
        setLoading(false);
        return;
      }

      await saveApiKey(apiKey.trim());
      onSetupComplete();
    } catch (err) {
      setError('שגיאה בחיבור. בדוק את האינטרנט שלך.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#0A0E1A', '#131929', '#1A2235']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Logo area */}
            <View style={styles.logoArea}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>🎓</Text>
              </View>
              <Text style={styles.appName}>English Master</Text>
              <Text style={styles.tagline}>AI-Powered English Learning</Text>
            </View>

            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>ברוך הבא! 🎉</Text>
              <Text style={styles.welcomeText}>
                כדי להתחיל ללמוד, נצטרך מפתח API של{' '}
                <Text style={styles.link} onPress={() => Linking.openURL('https://console.groq.com')}>
                  Groq
                </Text>
                {' '}(חינמי לחלוטין!)
              </Text>
            </View>

            {/* Steps */}
            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>📋 איך מקבלים מפתח?</Text>
              {[
                { num: '1', text: 'כנס לאתר console.groq.com', icon: '🌐' },
                { num: '2', text: 'הירשם בחינם (פחות מדקה)', icon: '📝' },
                { num: '3', text: 'לחץ על "API Keys" ← "Create API Key"', icon: '🔑' },
                { num: '4', text: 'העתק את המפתח שמתחיל ב-gsk_', icon: '📋' },
                { num: '5', text: 'הדבק אותו כאן למטה', icon: '✅' },
              ].map(step => (
                <View key={step.num} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNum}>{step.num}</Text>
                  </View>
                  <Text style={styles.stepIcon}>{step.icon}</Text>
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              ))}
            </View>

            {/* Input */}
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>🔐 מפתח ה-API שלך:</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={apiKey}
                    onChangeText={text => { setApiKey(text); setError(''); }}
                    placeholder="gsk_..."
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline={false}
                  />
                  <TouchableOpacity onPress={() => setShowKey(!showKey)} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{showKey ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>

                {error ? (
                  <View style={styles.errorRow}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                  </View>
                ) : null}

                <View style={styles.securityNote}>
                  <Text style={styles.securityIcon}>🔒</Text>
                  <Text style={styles.securityText}>
                    המפתח שמור רק על המכשיר שלך בצורה מוצפנת. אנחנו לא רואים אותו.
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* CTA */}
            <GradientButton
              title="🚀 התחל ללמוד!"
              onPress={handleSave}
              loading={loading}
              gradient={[COLORS.primary, '#8B5CF6', COLORS.primaryDark]}
              style={{ marginTop: SIZES.md }}
            />

            <TouchableOpacity
              onPress={() => Linking.openURL('https://console.groq.com')}
              style={styles.groqLink}
            >
              <Text style={styles.groqLinkText}>פתח את Groq Console →</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>
              English Master v1.0 • Powered by Groq AI
            </Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SIZES.md, paddingTop: 60, paddingBottom: 40 },
  logoArea: { alignItems: 'center', marginBottom: SIZES.xl },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primary + '25',
    borderWidth: 2, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  logoEmoji: { fontSize: 48 },
  appName: { color: COLORS.textPrimary, fontSize: SIZES.textXxxl, fontWeight: '800', letterSpacing: -1 },
  tagline: { color: COLORS.primary, fontSize: SIZES.textSm, marginTop: 4, letterSpacing: 2 },
  welcomeCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg,
    padding: SIZES.md, marginBottom: SIZES.md,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  welcomeTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXl, fontWeight: '700', marginBottom: 8 },
  welcomeText: { color: COLORS.textSecondary, fontSize: SIZES.textMd, lineHeight: 24 },
  link: { color: COLORS.primary, textDecorationLine: 'underline' },
  stepsCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg,
    padding: SIZES.md, marginBottom: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  stepsTitle: { color: COLORS.textPrimary, fontSize: SIZES.textLg, fontWeight: '700', marginBottom: SIZES.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  stepNum: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  stepIcon: { fontSize: 18, marginRight: 8 },
  stepText: { color: COLORS.textSecondary, fontSize: SIZES.textSm, flex: 1 },
  inputCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg,
    padding: SIZES.md, marginBottom: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  inputLabel: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontWeight: '600', marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: COLORS.bgCardLight, borderRadius: SIZES.radiusMd,
    padding: SIZES.md, color: COLORS.textPrimary, fontSize: SIZES.textMd,
    borderWidth: 1, borderColor: COLORS.borderLight, fontFamily: 'monospace',
  },
  eyeBtn: { padding: 8, marginLeft: 8 },
  eyeIcon: { fontSize: 20 },
  errorRow: {
    backgroundColor: COLORS.error + '15', borderRadius: SIZES.radiusMd,
    padding: 10, marginTop: 10, borderWidth: 1, borderColor: COLORS.error + '40',
  },
  errorText: { color: COLORS.error, fontSize: SIZES.textSm },
  securityNote: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 12,
    backgroundColor: COLORS.success + '10', borderRadius: SIZES.radiusMd,
    padding: 10, borderWidth: 1, borderColor: COLORS.success + '30',
  },
  securityIcon: { fontSize: 16, marginRight: 8 },
  securityText: { color: COLORS.textSecondary, fontSize: SIZES.textSm, flex: 1, lineHeight: 18 },
  groqLink: { alignItems: 'center', padding: SIZES.md },
  groqLinkText: { color: COLORS.primary, fontSize: SIZES.textMd, textDecorationLine: 'underline' },
  footer: { color: COLORS.textMuted, fontSize: SIZES.textXs, textAlign: 'center', marginTop: SIZES.md },
});
