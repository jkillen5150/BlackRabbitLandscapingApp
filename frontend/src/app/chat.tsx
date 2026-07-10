import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ScreenContent } from '@/components/screen-content';
import { ScreenShell } from '@/components/screen-shell';
import { Colors } from '@/constants/theme';
import { api, ChatMessage } from '@/lib/api';

const STARTERS = [
  'What should I charge for a quarter-acre mow in Yelm?',
  'How do I post a lawn job on Black Rabbit?',
  'Best time of year to reseed a lawn around Rainier, WA?',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>('grok-4.5');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    api
      .chatHealth()
      .then((h) => {
        setModel(h.model);
        setConfigured(h.xai_api_key_configured);
      })
      .catch(() => {
        setConfigured(false);
      });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;

      const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
      setMessages(nextMessages);
      setInput('');
      setSending(true);
      setError(null);

      try {
        const res = await api.chat(nextMessages);
        setMessages([...nextMessages, res.message]);
        if (res.model) setModel(res.model);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Chat failed');
      } finally {
        setSending(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      }
    },
    [messages, sending]
  );

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <ScreenContent>
            <Text style={styles.title}>Grok Assistant</Text>
            <Text style={styles.subtitle}>
              Local lawn & services help · model {model}
              {configured === false ? ' · API key not configured' : ''}
            </Text>

            {configured === false ? (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>
                  Set a real XAI_API_KEY in backend/.env, restart the API, then try again.
                </Text>
              </View>
            ) : null}

            {messages.length === 0 ? (
              <View style={styles.starters}>
                <Text style={styles.startersLabel}>Try asking</Text>
                {STARTERS.map((s) => (
                  <TouchableOpacity key={s} style={styles.starterChip} onPress={() => send(s)}>
                    <Text style={styles.starterText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              messages.map((m, i) => (
                <View
                  key={`${m.role}-${i}`}
                  style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.botBubble]}
                >
                  <Text style={styles.roleLabel}>{m.role === 'user' ? 'You' : 'Grok'}</Text>
                  <Text style={styles.bubbleText}>{m.content}</Text>
                </View>
              ))
            )}

            {sending ? (
              <View style={styles.thinking}>
                <ActivityIndicator color={Colors.light.primary} />
                <Text style={styles.thinkingText}>Thinking…</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScreenContent>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about lawn care, jobs, or local pros…"
            placeholderTextColor={Colors.light.textSecondary}
            multiline
            editable={!sending}
            onSubmitEditing={() => send(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.light.primary },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  banner: {
    backgroundColor: '#FEF3C7',
    borderColor: Colors.light.accent,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  bannerText: { color: Colors.light.text, fontSize: 14, lineHeight: 20 },
  starters: { gap: 10, marginTop: 8 },
  startersLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  starterChip: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 14,
    padding: 14,
  },
  starterText: { fontSize: 15, color: Colors.light.text, lineHeight: 21 },
  bubble: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    maxWidth: '92%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#E8F0E9',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bubbleText: { fontSize: 15, color: Colors.light.text, lineHeight: 22 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  thinkingText: { color: Colors.light.textSecondary, fontSize: 14 },
  error: { color: '#B91C1C', marginTop: 10, fontSize: 14 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  sendBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
