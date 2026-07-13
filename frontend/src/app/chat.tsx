/**
 * Grok full-page kept for deep links; primary chat lives on Home.
 * Not shown in the dock (zen).
 */
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
import { BackHeader } from '@/components/back-header';
import { ScreenContent } from '@/components/screen-content';
import { ScreenShell } from '@/components/screen-shell';
import { PageSubtitle, PageTitle } from '@/components/ui/primitives';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, ChatMessage } from '@/lib/api';
import { GROK_TAB_CONTEXT, OWNER } from '@/lib/business';

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    api.chatHealth().catch(() => {});
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      const next: ChatMessage[] = [...messages, { role: 'user', content }];
      setMessages(next);
      setInput('');
      setSending(true);
      setError(null);
      try {
        const res = await api.chat(next, GROK_TAB_CONTEXT);
        setMessages([...next, res.message]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Chat failed');
      } finally {
        setSending(false);
      }
    },
    [messages, sending]
  );

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <ScreenContent>
            <BackHeader />
            <PageTitle>Grok</PageTitle>
            <PageSubtitle>
              Prefer Home for booking. Here for questions — book {OWNER.brand} when ready.
            </PageSubtitle>
            {messages.map((m, i) => (
              <View
                key={`${m.role}-${i}`}
                style={[styles.bubble, m.role === 'user' ? styles.user : styles.bot]}
              >
                <Text style={styles.bubbleText}>{m.content}</Text>
              </View>
            ))}
            {sending ? <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 12 }} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScreenContent>
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask…"
            placeholderTextColor={Colors.light.muted}
            multiline
            onSubmitEditing={() => send(input)}
          />
          <TouchableOpacity
            style={[styles.send, (!input.trim() || sending) && { opacity: 0.4 }]}
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
  scroll: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: 16,
  },
  bubble: {
    borderRadius: Radius.md,
    padding: 14,
    marginTop: 10,
    maxWidth: '92%',
  },
  user: { alignSelf: 'flex-end', backgroundColor: Colors.light.softGreen },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  bubbleText: { fontSize: 15, color: Colors.light.text, lineHeight: 22 },
  error: { color: Colors.light.danger, marginTop: 10 },
  composer: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    color: Colors.light.text,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  send: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendText: { color: '#fff', fontWeight: '600' },
});
