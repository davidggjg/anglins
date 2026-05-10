import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, TextInput, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, LEVEL_INFO } from '../utils/theme';
import { GradientButton, Card } from '../components/UIComponents';
import {
  getApiKey, saveApiKey, deleteApiKey, getUserLevel,
  getUserStats, getNotificationTime, resetAllData,
} from '../services/storage';
import { validateApiKey } from '../services/groqService';
import {
  setupAllNotifications, cancelAllNotifications,
  getScheduledNotifications, requestNotificationPermissions,
} from '../services/notificationService';

export default function SettingsScreen({ navigation, onReset }) {
  const [apiKey, setApiKey]             = useState('');
  const [showKey, setShowKey]           = useState(false);
  const [keyStatus, setKeyStatus]       = useState('saved'); // saved | editing | validating | invalid
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifHour, setNotifHour]       = useState(19);
  const [notifMinute, setNotifMinute]   = useState(0);
  const [stats, setStats]               = useState(null);
  const [level, setLevel]               = useState(null);
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [k, l, s, t, notifs] = await Promise.all([
      getApiKey(), getUserLevel(), getUserStats(),
      getNotificationTime(), getScheduledNotifications(),
    ]);
    if (k) setApiKey('gsk_••••••••••••' + k.slice(-4));
    setLevel(l);
    setStats(s);
    setNotifHour(t.hour);
    setNotifMinute(t.minute);
    setScheduledCount(notifs.length);
    setNotifEnabled(notifs.length > 0);
  };

  const handleSaveKey = async () => {
    if (!apiKey.startsWith('gsk_')) { Alert.alert('שגיאה', 'מפתח חייב להתחיל ב-gsk_'); return; }
    setKeyStatus('validating');
    const result = await validateApiKey(apiKey);
    if (result.valid) {
      await saveApiKey(apiKey);
      setKeyStatus('saved');
      setApiKey('gsk_••••••••••••' + apiKey.slice(-4));
      Alert.alert('✅ נשמר', 'המפתח עודכן בהצלחה!');
    } else {
      setKeyStatus('invalid');
      Alert.alert('❌ שגיאה', result.error || 'מפתח לא תקין');
    }
  };

  const handleToggleNotif = async (val) => {
    setNotifEnabled(val);
    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setNotifEnabled(false);
        Alert.alert('הרשאה נדרשת', 'פתח הגדרות ואפשר התראות', [
          { text: 'ביטול' },
          { text: 'הגדרות', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      await setupAllNotifications(notifHour, notifMinute);
      const n = await getScheduledNotifications();
      setScheduledCount(n.length);
    } else {
      await cancelAllNotifications();
      setScheduledCount(0);
    }
  };

  const handleSaveNotifTime = async () => {
    await setupAllNotifications(notifHour, notifMinute);
    Alert.alert('✅ נשמר', `תזכורת יומית מוגדרת ל-${String(notifHour).padStart(2,'0')}:${String(notifMinute).padStart(2,'0')}`);
  };

  const handleReset = () => {
    Alert.alert(
      '⚠️ איפוס נתונים',
      'כל ההתקדמות, XP, שגיאות ושיעורים יימחקו. מפתח ה-API נשמר.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק הכל',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            Alert.alert('✅', 'הנתונים אופסו');
            if (onReset) onReset();
          },
        },
      ],
    );
  };

  const levelInfo = level ? LEVEL_INFO[level.code] : null;

  return (
    <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ הגדרות</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        {stats && level && (
          <View style={styles.profileCard}>
            <View style={[styles.levelCircle, { borderColor: levelInfo?.color }]}>
              <Text style={styles.levelEmoji}>{levelInfo?.emoji}</Text>
              <Text style={[styles.levelCode, { color: levelInfo?.color }]}>{level.code}</Text>
            </View>
            <View style={styles.profileStats}>
              <View style={styles.pStat}><Text style={styles.pStatNum}>{stats.xp}</Text><Text style={styles.pStatLbl}>XP</Text></View>
              <View style={styles.pStat}><Text style={styles.pStatNum}>{stats.wordsLearned}</Text><Text style={styles.pStatLbl}>מילים</Text></View>
              <View style={styles.pStat}><Text style={styles.pStatNum}>{stats.streak}🔥</Text><Text style={styles.pStatLbl}>רצף</Text></View>
              <View style={styles.pStat}><Text style={styles.pStatNum}>{stats.lessonsCompleted}</Text><Text style={styles.pStatLbl}>שיעורים</Text></View>
            </View>
          </View>
        )}

        {/* API Key */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 מפתח Groq API</Text>
          <View style={styles.keyCard}>
            <View style={styles.keyRow}>
              <TextInput
                style={styles.keyInput}
                value={keyStatus === 'editing' ? apiKey : apiKey}
                onChangeText={t => { setApiKey(t); setKeyStatus('editing'); }}
                onFocus={() => { setApiKey(''); setKeyStatus('editing'); }}
                placeholder="gsk_..."
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowKey(!showKey)} style={styles.eyeBtn}>
                <Text>{showKey ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {keyStatus === 'editing' && (
              <GradientButton
                title={keyStatus === 'validating' ? 'בודק...' : 'שמור מפתח'}
                onPress={handleSaveKey}
                loading={keyStatus === 'validating'}
                style={{ marginTop: 10 }}
              />
            )}

            <View style={styles.keyHint}>
              <Text style={styles.keyHintText}>🔒 נשמר מוצפן במכשיר בלבד</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://console.groq.com')}>
                <Text style={styles.keyLink}>קבל מפתח חינמי →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 התראות</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>תזכורת יומית</Text>
                <Text style={styles.settingDesc}>{scheduledCount > 0 ? `${scheduledCount} התראות מתוזמנות` : 'כבוי'}</Text>
              </View>
              <Switch
                value={notifEnabled}
                onValueChange={handleToggleNotif}
                trackColor={{ false: COLORS.bgCardMed, true: COLORS.primary }}
                thumbColor={COLORS.textPrimary}
              />
            </View>

            {notifEnabled && (
              <View style={styles.timeSection}>
                <Text style={styles.timeLabel}>שעת תזכורת:</Text>
                <View style={styles.timeRow}>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeInputLabel}>שעה</Text>
                    <TextInput
                      style={styles.timeField}
                      value={String(notifHour)}
                      onChangeText={t => setNotifHour(Math.min(23, Math.max(0, parseInt(t) || 0)))}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.timeSep}>:</Text>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeInputLabel}>דקה</Text>
                    <TextInput
                      style={styles.timeField}
                      value={String(notifMinute).padStart(2, '0')}
                      onChangeText={t => setNotifMinute(Math.min(59, Math.max(0, parseInt(t) || 0)))}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>

                <View style={styles.quickTimes}>
                  {[[8,0,'בוקר 08:00'],[12,0,'צהריים 12:00'],[19,0,'ערב 19:00'],[21,30,'לילה 21:30']].map(([h, m, label]) => (
                    <TouchableOpacity key={label} style={[styles.quickTime, notifHour === h && notifMinute === m && styles.quickTimeActive]}
                      onPress={() => { setNotifHour(h); setNotifMinute(m); }}>
                      <Text style={[styles.quickTimeText, notifHour === h && notifMinute === m && { color: COLORS.primary }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <GradientButton title="💾 שמור שעה" onPress={handleSaveNotifTime} style={{ marginTop: 12 }} />
              </View>
            )}
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ אודות</Text>
          <View style={styles.card}>
            {[
              { label: 'גרסה', value: '1.0.0' },
              { label: 'מודל AI', value: 'Groq Llama-3.3-70b' },
              { label: 'מסגרת', value: 'React Native + Expo' },
              { label: 'שפה ניתנת ללימוד', value: 'אנגלית 🇬🇧' },
            ].map(item => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { paddingBottom: 80 }]}>
          <Text style={styles.sectionTitle}>⚠️ אזור מסוכן</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleReset}>
            <Text style={styles.dangerBtnText}>🗑️ אפס את כל ההתקדמות</Text>
            <Text style={styles.dangerBtnSub}>לא ניתן לשחזר. מפתח נשמר.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SIZES.md, paddingTop: 52,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { color: COLORS.textSecondary, fontSize: 24 },
  headerTitle: { color: COLORS.textPrimary, fontSize: SIZES.textXl, fontWeight: '800' },
  content: { padding: SIZES.md },

  profileCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md,
    flexDirection: 'row', alignItems: 'center', gap: SIZES.md, marginBottom: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  levelCircle: {
    width: 70, height: 70, borderRadius: 35, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCardLight,
  },
  levelEmoji: { fontSize: 24 },
  levelCode: { fontSize: SIZES.textLg, fontWeight: '900' },
  profileStats: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pStat: { width: '44%', alignItems: 'center', backgroundColor: COLORS.bgCardLight, borderRadius: SIZES.radiusMd, padding: 8 },
  pStatNum: { color: COLORS.textPrimary, fontSize: SIZES.textLg, fontWeight: '800' },
  pStatLbl: { color: COLORS.textMuted, fontSize: SIZES.textXs },

  section: { marginBottom: SIZES.md },
  sectionTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: SIZES.textMd, marginBottom: 10 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border },

  keyCard: { backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg, padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  keyRow: { flexDirection: 'row', alignItems: 'center' },
  keyInput: {
    flex: 1, backgroundColor: COLORS.bgCardLight, borderRadius: SIZES.radiusMd,
    padding: 12, color: COLORS.textPrimary, fontFamily: 'monospace',
    borderWidth: 1, borderColor: COLORS.borderLight, fontSize: SIZES.textSm,
  },
  eyeBtn: { padding: 10 },
  keyHint: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  keyHintText: { color: COLORS.textMuted, fontSize: SIZES.textXs },
  keyLink: { color: COLORS.primary, fontSize: SIZES.textXs, textDecorationLine: 'underline' },

  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabel: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontWeight: '600' },
  settingDesc: { color: COLORS.textMuted, fontSize: SIZES.textXs, marginTop: 2 },

  timeSection: { marginTop: SIZES.md, paddingTop: SIZES.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  timeLabel: { color: COLORS.textSecondary, fontSize: SIZES.textSm, marginBottom: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 },
  timeInput: { alignItems: 'center' },
  timeInputLabel: { color: COLORS.textMuted, fontSize: SIZES.textXs, marginBottom: 4 },
  timeField: {
    backgroundColor: COLORS.bgCardLight, borderRadius: SIZES.radiusMd, width: 70, height: 52,
    color: COLORS.textPrimary, fontSize: SIZES.textXl, fontWeight: '800',
    textAlign: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  timeSep: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '900', marginTop: 16 },
  quickTimes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickTime: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.bgCardLight, borderWidth: 1, borderColor: COLORS.border,
  },
  quickTimeActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  quickTimeText: { color: COLORS.textSecondary, fontSize: SIZES.textXs, fontWeight: '600' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { color: COLORS.textSecondary, fontSize: SIZES.textSm },
  infoValue: { color: COLORS.textPrimary, fontSize: SIZES.textSm, fontWeight: '600' },

  dangerBtn: {
    backgroundColor: COLORS.error + '15', borderRadius: SIZES.radiusLg, padding: SIZES.md,
    borderWidth: 1, borderColor: COLORS.error + '40', alignItems: 'center',
  },
  dangerBtnText: { color: COLORS.error, fontWeight: '700', fontSize: SIZES.textMd },
  dangerBtnSub: { color: COLORS.textMuted, fontSize: SIZES.textXs, marginTop: 4 },
});
