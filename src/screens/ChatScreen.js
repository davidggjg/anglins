import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../utils/theme';
import { chatWithTutor } from '../services/groqService';
import { getUserLevel } from '../services/storage';

const STARTERS = [
  "Hi! I want to practice my English.",
  "Can you help me with my pronunciation?",
  "What's the difference between 'since' and 'for'?",
  "Let's talk about my hobbies.",
  "How was your day?",
];

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    {
      id: '0',
      role: 'assistant',
      content: "שלום! אני Max, המורה האישי שלך לאנגלית 🎓\n\nבוא נתרגל שיחה באנגלית! אני אתקן אותך בעדינות ואעזור לך להשתפר. איך אני יכול לעזור לך היום?",
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLevel, setUserLevel] = useState('B1');

  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getUserLevel().then(l => { if (l) setUserLevel(l.code); });
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;

    setInput('');
    const newMsg = { id: Date.now().toString(), role: 'user', content: msgText };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Build API messages (exclude the first welcome message)
      const apiMessages = updatedMessages
        .slice(1) // Remove welcome
        .map(m => ({ role: m.role, content: m.content }));

      const response = await chatWithTutor(apiMessages, userLevel);

      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: response,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_err',
        role: 'assistant',
        content: '❌ שגיאה בחיבור. בדוק את האינטרנט ונסה שוב.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (msg) => {
    const isUser = msg.role === 'user';

    return (
      <View key={msg.id} style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {msg.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient colors={['#0A0E1A', '#131929']} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.tutorInfo}>
            <View style={styles.tutorAvatar}>
              <Text style={styles.tutorAvatarText}>M</Text>
            </View>
            <View>
              <Text style={styles.tutorName}>Max - AI Tutor</Text>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>מוכן לשיחה</Text>
              </View>
            </View>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{userLevel}</Text>
          </View>
        </View>

        {/* Conversation starters */}
        {messages.length === 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.startersRow}>
            {STARTERS.map((s, i) => (
              <TouchableOpacity key={i} style={styles.starter} onPress={() => sendMessage(s)}>
                <Text style={styles.starterText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          {loading && (
            <View style={[styles.messageRow]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>M</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
                <Text style={styles.typingText}>מקליד...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="כתוב משהו באנגלית..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.sendBtnInner}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SIZES.md, paddingTop: 55,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tutorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tutorAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  tutorAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  tutorName: { color: COLORS.textPrimary, fontSize: SIZES.textMd, fontWeight: '700' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  onlineText: { color: COLORS.success, fontSize: SIZES.textXs },
  levelBadge: {
    backgroundColor: COLORS.primary + '25', borderRadius: SIZES.radiusFull,
    paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.primary + '50',
  },
  levelText: { color: COLORS.primary, fontWeight: '700', fontSize: SIZES.textSm },
  startersRow: { maxHeight: 52, paddingHorizontal: SIZES.md, paddingVertical: 8 },
  starter: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusFull,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  starterText: { color: COLORS.primary, fontSize: SIZES.textSm },
  messagesList: { flex: 1 },
  messagesContent: { padding: SIZES.md, paddingBottom: SIZES.md },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  messageRowUser: { flexDirection: 'row-reverse' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  bubble: {
    maxWidth: '75%', borderRadius: SIZES.radiusMd, padding: 12,
  },
  bubbleAI: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary, borderBottomRightRadius: 4,
  },
  bubbleText: { color: COLORS.textPrimary, fontSize: SIZES.textMd, lineHeight: 22 },
  bubbleTextUser: { color: '#FFF' },
  typingBubble: { opacity: 0.7 },
  typingText: { color: COLORS.textMuted, fontSize: SIZES.textSm, fontStyle: 'italic' },
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', padding: SIZES.md, gap: 10,
    backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 10 : SIZES.md,
  },
  input: {
    flex: 1, backgroundColor: COLORS.bgCardLight, borderRadius: SIZES.radiusMd,
    padding: 12, color: COLORS.textPrimary, fontSize: SIZES.textMd,
    borderWidth: 1, borderColor: COLORS.border, maxHeight: 100,
  },
  sendBtn: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#FFF', fontSize: 18 },
});
