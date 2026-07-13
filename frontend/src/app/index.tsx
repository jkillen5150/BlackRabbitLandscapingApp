import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Linking,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { ScreenContent } from '@/components/screen-content';
import { ScreenShell } from '@/components/screen-shell';
import { Button, Card, Chip, PageSubtitle, PageTitle, Pill, SectionLabel } from '@/components/ui/primitives';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, ChatMessage, Job } from '@/lib/api';
import {
  HOME_CHAT_CONTEXT,
  OWNER,
  OWNER_SMS,
  OWNER_TEL,
  openOwnerSms,
  ownerSmsBody,
} from '@/lib/business';
import { parseVoiceRequest } from '@/lib/parse-voice-request';
import { useSession } from '@/lib/session';

const YELM_LAT = 46.9421;
const YELM_LON = -122.6065;

const DEFAULT_SERVICES = [
  'Lawn Care',
  'Landscaping',
  'Window Washing',
  'Handyman',
  'Pressure Washing',
  'Gutter Cleaning',
];

const URGENCY_OPTIONS = [
  { label: 'Today', value: 'Today' },
  { label: 'This week', value: 'This Week' },
  { label: 'Next week', value: 'Next Week' },
  { label: 'Quote', value: 'Quote' },
];

const CHAT_STARTERS = [
  'Can you mow me this week in Yelm?',
  'Front and back, edge the driveway',
  'What do you charge for a standard mow?',
];

function weatherLine(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Fair';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 65) return 'Rain';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Storms';
  return 'Cloudy';
}

export default function HomeScreen() {
  const { session, signInWithPhone, user } = useSession();
  const [weather, setWeather] = useState<{ temp: number | null; description: string }>({
    temp: null,
    description: '',
  });
  const [serviceTypes, setServiceTypes] = useState<string[]>(DEFAULT_SERVICES);
  const [submitting, setSubmitting] = useState(false);
  const [submittingRoute, setSubmittingRoute] = useState<'owner' | 'open' | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [serviceType, setServiceType] = useState('Lawn Care');
  const [urgency, setUrgency] = useState('This Week');
  const [details, setDetails] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successRoute, setSuccessRoute] = useState<'owner' | 'open'>('owner');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') document.title = 'Black Rabbit';
  }, []);

  useEffect(() => {
    api
      .getServiceTypes()
      .then((data) => {
        if (data.types?.length) {
          setServiceTypes(data.types);
          setServiceType(data.types[0]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session?.userId) {
      api.getCustomerJobs(session.userId).then(setRecentJobs).catch(() => {});
    }
  }, [session?.userId, showSuccess]);

  useEffect(() => {
    if (user?.address) setAddress(user.address);
    if (user?.name && !name) setName(user.name);
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user, name, phone]);

  useEffect(() => {
    (async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${YELM_LAT}&longitude=${YELM_LON}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America/Los_Angeles`;
        const res = await fetch(url);
        const data = await res.json();
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          description: weatherLine(data.current.weather_code),
        });
      } catch {
        setWeather({ temp: null, description: '' });
      }
    })();
  }, []);

  const applyParsedToForm = useCallback(
    (text: string) => {
      const parsed = parseVoiceRequest(text, serviceTypes);
      if (parsed.serviceType) setServiceType(parsed.serviceType);
      if (parsed.urgency) setUrgency(parsed.urgency);
      if (parsed.address) setAddress(parsed.address);
      if (parsed.name && !name.trim()) setName(parsed.name);
      if (parsed.phone && !phone.trim()) setPhone(parsed.phone);
      if (parsed.details?.trim()) {
        setDetails((prev) =>
          prev.trim().length > parsed.details.trim().length ? prev : parsed.details.trim()
        );
      } else if (text.trim().length > 12) {
        setDetails((prev) => prev || text.trim());
      }
      setShowForm(true);
    },
    [serviceTypes, name, phone]
  );

  const sendChat = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || chatSending) return;
      const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content }];
      setChatMessages(nextMessages);
      setChatInput('');
      setChatSending(true);
      setChatError(null);
      applyParsedToForm(content);
      try {
        const res = await api.chat(nextMessages, HOME_CHAT_CONTEXT);
        setChatMessages([...nextMessages, res.message]);
      } catch (e) {
        setChatError(e instanceof Error ? e.message : 'Chat failed');
      } finally {
        setChatSending(false);
      }
    },
    [chatMessages, chatSending, applyParsedToForm]
  );

  const handleSubmit = async (route: 'owner' | 'open') => {
    if (!name.trim() && !phone.trim() && !session) {
      Alert.alert('Almost there', 'Add your name or phone so we can reach you.');
      setShowForm(true);
      return;
    }
    if (!details.trim()) {
      Alert.alert('One more thing', 'Describe what you need — chat or type a short note.');
      return;
    }

    setSubmitting(true);
    setSubmittingRoute(route);
    try {
      const finalPhone = phone.trim() || session?.phone || '';
      const finalName = name.trim() || session?.name || 'Neighbor';
      const finalDetails = details.trim();
      const finalAddress = address.trim() || 'Yelm, WA';

      if (!session && finalPhone) {
        await signInWithPhone(finalPhone, finalName, false);
      }

      await api.postJob({
        name: finalName,
        phone: finalPhone,
        service_type: serviceType,
        urgency,
        description: finalDetails,
        address: finalAddress,
        route,
      });

      if (route === 'owner') {
        Linking.openURL(
          openOwnerSms(
            ownerSmsBody({
              name: finalName,
              phone: finalPhone || 'no phone',
              serviceType,
              urgency,
              address: finalAddress,
              details: finalDetails,
            })
          )
        ).catch(() => {});
      }

      setSuccessRoute(route);
      setShowSuccess(true);
      setDetails('');
      setChatMessages([]);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (e: any) {
      Alert.alert('Could not submit', e.message || 'Please try again.');
    } finally {
      setSubmitting(false);
      setSubmittingRoute(null);
    }
  };

  const isFormReady = Boolean((name.trim() || phone.trim() || session) && details.trim());

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenContent>
            <View style={styles.hero}>
              <View style={styles.heroMeta}>
                <Text style={styles.brand}>Black Rabbit</Text>
                {weather.temp !== null ? (
                  <Text style={styles.weather}>
                    {weather.temp}° · {weather.description}
                  </Text>
                ) : null}
              </View>
              <PageTitle>What do you need done?</PageTitle>
              <PageSubtitle>Book us for lawn and outdoor work. Simple as that.</PageSubtitle>
            </View>

            {showSuccess ? (
              <Card style={styles.successCard}>
                <Text style={styles.successTitle}>
                  {successRoute === 'owner' ? 'We got it' : 'Posted'}
                </Text>
                <Text style={styles.successBody}>
                  {successRoute === 'owner'
                    ? `We'll be in touch. Or call ${OWNER.phoneDisplay}.`
                    : 'Local pros can see your request.'}
                </Text>
              </Card>
            ) : null}

            {/* 1 · Service */}
            <View style={styles.block}>
              <SectionLabel>Service</SectionLabel>
              <View style={styles.chipRow}>
                {serviceTypes.map((type) => (
                  <Chip
                    key={type}
                    label={type}
                    selected={serviceType === type}
                    onPress={() => setServiceType(type)}
                  />
                ))}
              </View>
            </View>

            {/* 2 · Grok */}
            <Card style={styles.block}>
              <SectionLabel>Tell us</SectionLabel>
              <Text style={styles.lead}>Plain English. We'll fill in the rest.</Text>

              {chatMessages.length === 0 ? (
                <View style={styles.starters}>
                  {CHAT_STARTERS.map((s) => (
                    <TouchableOpacity key={s} style={styles.starter} onPress={() => sendChat(s)}>
                      <Text style={styles.starterText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.thread}>
                  {chatMessages.map((m, i) => (
                    <View
                      key={`${m.role}-${i}`}
                      style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}
                    >
                      <Text style={styles.bubbleText}>{m.content}</Text>
                    </View>
                  ))}
                </View>
              )}

              {chatSending ? (
                <View style={styles.thinking}>
                  <ActivityIndicator color={Colors.light.primary} size="small" />
                </View>
              ) : null}
              {chatError ? <Text style={styles.error}>{chatError}</Text> : null}

              <View style={styles.composer}>
                <TextInput
                  style={styles.composerInput}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Describe the job…"
                  placeholderTextColor={Colors.light.muted}
                  multiline
                  editable={!chatSending}
                  onSubmitEditing={() => sendChat(chatInput)}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!chatInput.trim() || chatSending) && styles.dim]}
                  onPress={() => sendChat(chatInput)}
                  disabled={!chatInput.trim() || chatSending}
                >
                  <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* 3 · Request */}
            <Card style={styles.block}>
              <View style={styles.draftHead}>
                <View style={{ flex: 1 }}>
                  <SectionLabel>Your request</SectionLabel>
                  <Text style={styles.draftTitle}>
                    {serviceType}
                    <Text style={styles.draftMeta}> · {urgency}</Text>
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowForm((v) => !v)} hitSlop={12}>
                  <Text style={styles.editLink}>{showForm ? 'Done' : 'Edit'}</Text>
                </TouchableOpacity>
              </View>

              {details.trim() ? (
                <Text style={styles.draftBody} numberOfLines={showForm ? undefined : 3}>
                  {details}
                </Text>
              ) : (
                <Text style={styles.draftEmpty}>Chat above or edit to add details.</Text>
              )}

              {showForm ? (
                <View style={styles.form}>
                  <Text style={styles.fieldLabel}>When</Text>
                  <View style={styles.chipRow}>
                    {URGENCY_OPTIONS.map((opt) => (
                      <Chip
                        key={opt.value}
                        label={opt.label}
                        selected={urgency === opt.value}
                        onPress={() => setUrgency(opt.value)}
                      />
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={Colors.light.muted}
                  />
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="(360) 555-1234"
                    placeholderTextColor={Colors.light.muted}
                    keyboardType="phone-pad"
                  />
                  <Text style={styles.fieldLabel}>Address</Text>
                  <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Yelm, WA"
                    placeholderTextColor={Colors.light.muted}
                  />
                  <Text style={styles.fieldLabel}>Details</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={details}
                    onChangeText={setDetails}
                    placeholder="Mow, edge, bags…"
                    placeholderTextColor={Colors.light.muted}
                    multiline
                  />
                </View>
              ) : null}

              <Button
                title="Request Black Rabbit"
                onPress={() => handleSubmit('owner')}
                loading={submitting && submittingRoute === 'owner'}
                disabled={!isFormReady || submitting}
                style={styles.primaryCta}
              />
              <TouchableOpacity
                onPress={() => handleSubmit('open')}
                disabled={!isFormReady || submitting}
                style={styles.secondaryLink}
              >
                <Text style={[styles.secondaryLinkText, (!isFormReady || submitting) && styles.dim]}>
                  {submitting && submittingRoute === 'open' ? 'Posting…' : 'Post for other pros instead'}
                </Text>
              </TouchableOpacity>
            </Card>

            <View style={styles.contactLine}>
              <TouchableOpacity onPress={() => Linking.openURL(OWNER_TEL)}>
                <Text style={styles.contactLink}>Call {OWNER.phoneDisplay}</Text>
              </TouchableOpacity>
              <Text style={styles.dot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL(OWNER_SMS)}>
                <Text style={styles.contactLink}>Text</Text>
              </TouchableOpacity>
            </View>

            {recentJobs.length > 0 ? (
              <View style={styles.recent}>
                <SectionLabel>Recent</SectionLabel>
                {recentJobs.slice(0, 3).map((job) => (
                  <View key={job.id} style={styles.recentRow}>
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {job.service_type}
                    </Text>
                    <Pill tone={job.status === 'owner_direct' ? 'gold' : 'green'}>
                      {job.status === 'owner_direct' ? 'Us' : job.status}
                    </Pill>
                  </View>
                ))}
              </View>
            ) : null}
          </ScreenContent>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.seven,
  },
  hero: { marginBottom: Spacing.six },
  heroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  brand: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.light.muted,
  },
  weather: { fontSize: 13, color: Colors.light.textSecondary, fontWeight: '500' },
  successCard: {
    marginBottom: Spacing.five,
    backgroundColor: Colors.light.softGreen,
    borderColor: Colors.light.softGreen,
  },
  successTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.primary },
  successBody: { marginTop: 6, fontSize: 15, color: Colors.light.text, lineHeight: 21 },
  block: { marginBottom: Spacing.five },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lead: { fontSize: 15, color: Colors.light.textSecondary, marginBottom: Spacing.four, lineHeight: 21 },
  starters: { gap: 8, marginBottom: Spacing.three },
  starter: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  starterText: { fontSize: 14, color: Colors.light.text, lineHeight: 20 },
  thread: { gap: 8, marginBottom: Spacing.three },
  bubble: { borderRadius: Radius.md, padding: 12, maxWidth: '90%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: Colors.light.softGreen },
  bubbleBot: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  bubbleText: { fontSize: 15, color: Colors.light.text, lineHeight: 21 },
  thinking: { marginBottom: 8 },
  error: { color: Colors.light.danger, fontSize: 13, marginBottom: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 100,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.text,
  },
  sendBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  dim: { opacity: 0.4 },
  draftHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  draftTitle: { fontSize: 20, fontWeight: '600', color: Colors.light.text, letterSpacing: -0.3 },
  draftMeta: { fontWeight: '400', color: Colors.light.textSecondary, fontSize: 17 },
  editLink: { fontSize: 15, fontWeight: '600', color: Colors.light.primaryLight, marginTop: 2 },
  draftBody: { fontSize: 15, color: Colors.light.text, lineHeight: 22, marginBottom: 8 },
  draftEmpty: { fontSize: 14, color: Colors.light.muted, marginBottom: 8 },
  form: {
    marginTop: Spacing.three,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.muted,
    marginBottom: 8,
    marginTop: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.light.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.light.text,
  },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  primaryCta: { marginTop: Spacing.five },
  secondaryLink: { marginTop: Spacing.four, alignItems: 'center', paddingVertical: 8 },
  secondaryLinkText: { fontSize: 14, fontWeight: '500', color: Colors.light.textSecondary },
  contactLine: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.six,
  },
  contactLink: { fontSize: 14, fontWeight: '500', color: Colors.light.primaryLight },
  dot: { color: Colors.light.muted },
  recent: { marginBottom: Spacing.four },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 12,
  },
  recentTitle: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.light.text },
});
