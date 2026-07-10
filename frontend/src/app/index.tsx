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
import { Colors } from '@/constants/theme';
import { api, Job } from '@/lib/api';
import { useSession } from '@/lib/session';

const YELM_LAT = 46.9421;
const YELM_LON = -122.6065;
const PHONE_DIGITS = '4079511663';
const PHONE = '(407) 951-1663';
const PHONE_E164 = `+1${PHONE_DIGITS}`;
const PHONE_TEL = `tel:${PHONE_E164}`;
const SMS_TEL = `sms:${PHONE_E164}`;

const DEFAULT_SERVICES = ['Lawn Care', 'Landscaping', 'Window Washing', 'Handyman'];

const URGENCY_OPTIONS = [
  { label: 'Today / Emergency', value: 'Today', icon: '🚨' },
  { label: 'This Week', value: 'This Week', icon: '📅' },
  { label: 'Next Week', value: 'Next Week', icon: '🗓️' },
  { label: 'Just a Quote', value: 'Quote', icon: '💬' },
];

export default function PostJobScreen() {
  const { session, signInWithPhone, user } = useSession();
  const [weather, setWeather] = useState({ temp: null, description: 'Loading...' });
  const [serviceTypes, setServiceTypes] = useState<string[]>(DEFAULT_SERVICES);
  const [submitting, setSubmitting] = useState(false);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [serviceType, setServiceType] = useState('Lawn Care');
  const [urgency, setUrgency] = useState('Today');
  const [details, setDetails] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Black Rabbit Services';
    }
  }, []);

  useEffect(() => {
    api.getServiceTypes().then((data) => {
      setServiceTypes(data.types);
      if (data.types.length) setServiceType(data.types[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (session?.userId) {
      api.getCustomerJobs(session.userId).then(setRecentJobs).catch(() => {});
    }
  }, [session?.userId, showSuccess]);

  useEffect(() => {
    if (user?.address) setAddress(user.address);
  }, [user?.address]);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${YELM_LAT}&longitude=${YELM_LON}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America/Los_Angeles`;
        const res = await fetch(url);
        const data = await res.json();
        const temp = Math.round(data.current.temperature_2m);
        setWeather({ temp, description: getWeatherDescription(data.current.weather_code) });
      } catch {
        setWeather({ temp: 68, description: 'Partly cloudy' });
      }
    }
    fetchWeather();
  }, []);

  function getWeatherDescription(code: number): string {
    if (code === 0) return 'Clear skies';
    if (code <= 3) return 'Mainly clear';
    if (code === 45 || code === 48) return 'Foggy';
    if (code >= 51 && code <= 55) return 'Light drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 80 && code <= 82) return 'Rain showers';
    if (code >= 95) return 'Thunderstorms';
    return 'Cloudy';
  }

  const handleSubmit = async () => {
    if (!name.trim() && !phone.trim()) {
      Alert.alert('Almost there', 'Please enter your name or phone so we can reach you.');
      return;
    }
    if (!details.trim()) {
      Alert.alert('Tell us more', 'Describe what you need below.');
      return;
    }

    setSubmitting(true);
    try {
      const finalPhone = phone.trim() || session?.phone || '';
      const finalName = name.trim() || 'Neighbor';
      const finalDetails = details.trim();

      if (!session && finalPhone) {
        await signInWithPhone(finalPhone, finalName, false);
      }

      const finalAddress = address.trim() || 'Yelm, WA';

      await api.postJob({
        name: finalName,
        phone: finalPhone,
        service_type: serviceType,
        urgency,
        description: finalDetails,
        address: finalAddress,
      });

      setShowSuccess(true);
      setName('');
      setPhone('');
      setAddress(user?.address || '');
      setDetails('');
      setUrgency('Today');
      setTimeout(() => setShowSuccess(false), 4200);
    } catch (e: any) {
      Alert.alert('Could not submit', e.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const callUs = () => Linking.openURL(PHONE_TEL).catch(() => Alert.alert('Call us', PHONE));
  const textUs = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = SMS_TEL;
      return;
    }
    Linking.openURL(SMS_TEL).catch(() => Alert.alert('Text us', `Message us at ${PHONE}`));
  };
  const isFormReady = (name.trim() || phone.trim() || session) && details.trim();
  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <ScreenContent>
          <View style={styles.pageHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.heroTitle}>Request Service</Text>
              <Text style={styles.tagline}>Yelm, WA · Lawn care & local services</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.weatherTemp}>{weather.temp !== null ? `${weather.temp}°F` : '--'}</Text>
              <Text style={styles.weatherDesc}>{weather.description}</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactBtn} onPress={textUs}>
              <Text style={styles.contactBtnText}>💬 Text</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, styles.contactBtnPrimary]} onPress={callUs}>
              <Text style={styles.contactBtnTextPrimary}>📞 Call</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.weatherNote}>
            Most people just need their lawn handled fast — post a job below.
          </Text>

          {showSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>✅ Request posted!</Text>
              <Text style={styles.successText}>Local providers can see your request. Expect contact soon.</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What do you need?</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Service type</Text>
              <View style={styles.serviceRow}>
                {serviceTypes.map((type) => {
                  const selected = serviceType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.serviceChip, selected && styles.serviceChipSelected]}
                      onPress={() => setServiceType(type)}
                    >
                      <Text style={[styles.serviceLabel, selected && styles.serviceLabelSelected]}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Smith"
                placeholderTextColor="#8A958B"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                placeholder="(360) 555-1234"
                placeholderTextColor="#8A958B"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Job address</Text>
              <Text style={styles.fieldHint}>Optional — helps providers know where to go</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Main St, Yelm, WA"
                placeholderTextColor="#8A958B"
                value={address}
                onChangeText={setAddress}
                autoCapitalize="words"
                autoComplete="street-address"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>How soon?</Text>
              <View style={styles.urgencyRow}>
                {URGENCY_OPTIONS.map((opt) => {
                  const selected = urgency === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.urgencyChip, selected && styles.urgencyChipSelected]}
                      onPress={() => setUrgency(opt.value)}
                    >
                      <Text style={styles.urgencyIcon}>{opt.icon}</Text>
                      <Text style={[styles.urgencyLabel, selected && styles.urgencyLabelSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Describe the job</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Mow front and back, edge driveway, trim bushes…"
                placeholderTextColor="#8A958B"
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (!isFormReady || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!isFormReady || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Post Request</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.disclaimer}>
              Free to post. Local providers see your request and reach out directly.
            </Text>
          </View>

          {recentJobs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your posted jobs</Text>
              {recentJobs.slice(0, 5).map((job) => (
                <View key={job.id} style={styles.requestCard}>
                  <View style={styles.requestTop}>
                    <Text style={styles.requestName}>{job.service_type}</Text>
                    <Text style={styles.statusBadge}>{job.status}</Text>
                  </View>
                  <Text style={styles.requestDetails}>{job.description}</Text>
                  <Text style={styles.requestUrgency}>{job.urgency} · {job.address}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerNote}>Black Rabbit Services · Yelm, WA</Text>
          </View>
          </ScreenContent>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: 8, paddingBottom: 12, gap: 16,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  headerRight: { alignItems: 'flex-end', flexShrink: 0 },
  heroTitle: { fontSize: 26, fontWeight: '700', color: Colors.light.primary, letterSpacing: -0.3 },
  tagline: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 2 },
  contactRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  contactBtn: {
    backgroundColor: Colors.light.backgroundElement, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.light.border, minHeight: 44, justifyContent: 'center',
  },
  contactBtnPrimary: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  contactBtnText: { color: Colors.light.primary, fontSize: 13, fontWeight: '600' },
  contactBtnTextPrimary: { color: '#fff', fontSize: 13, fontWeight: '600' },
  weatherTemp: { fontSize: 22, fontWeight: '700', color: Colors.light.primary },
  weatherDesc: { fontSize: 12, fontWeight: '500', color: Colors.light.textSecondary, marginTop: 2 },
  weatherNote: {
    fontSize: 14, color: Colors.light.textSecondary, marginBottom: 20,
    lineHeight: 20, backgroundColor: Colors.light.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.light.border,
  },
  successBanner: {
    backgroundColor: '#DCFCE7', borderRadius: 16, padding: 16, marginBottom: 16,
    borderLeftWidth: 5, borderLeftColor: Colors.light.success,
  },
  successTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.success },
  successText: { fontSize: 15, color: '#14532d', marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 21, fontWeight: '700', color: Colors.light.text, marginBottom: 6 },
  field: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  fieldHint: { fontSize: 13, color: Colors.light.textSecondary, marginTop: -4, marginBottom: 8 },
  serviceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: {
    backgroundColor: Colors.light.card, borderRadius: 12, borderWidth: 2,
    borderColor: Colors.light.border, paddingVertical: 10, paddingHorizontal: 12,
    minWidth: '47%', flexGrow: 1,
  },
  serviceChipSelected: { borderColor: Colors.light.primary, backgroundColor: '#E8F0E9' },
  serviceLabel: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  serviceLabelSelected: { color: Colors.light.primary },
  input: {
    backgroundColor: Colors.light.card, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.light.border, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, color: Colors.light.text,
  },
  textarea: { minHeight: 108, textAlignVertical: 'top', paddingTop: 14 },
  urgencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  urgencyChip: {
    flex: 1, minWidth: '47%', backgroundColor: Colors.light.card, borderRadius: 16,
    borderWidth: 2, borderColor: Colors.light.border, paddingVertical: 14,
    paddingHorizontal: 12, alignItems: 'center',
  },
  urgencyChipSelected: { borderColor: Colors.light.primary, backgroundColor: '#E8F0E9' },
  urgencyIcon: { fontSize: 20, marginBottom: 2 },
  urgencyLabel: { fontSize: 13, fontWeight: '600', color: Colors.light.text, textAlign: 'center' },
  urgencyLabelSelected: { color: Colors.light.primary },
  submitBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 999, paddingVertical: 18,
    alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { backgroundColor: '#9CA89E' },
  submitText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  disclaimer: { textAlign: 'center', fontSize: 13, color: Colors.light.textSecondary, marginTop: 12 },
  requestCard: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestName: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  statusBadge: {
    fontSize: 12, fontWeight: '600', color: Colors.light.primary,
    backgroundColor: '#E8F0E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  requestUrgency: { marginTop: 4, fontSize: 13, color: Colors.light.textSecondary },
  requestDetails: { marginTop: 6, fontSize: 15, color: Colors.light.text, lineHeight: 21 },
  footer: { marginTop: 20, alignItems: 'center', paddingVertical: 10 },
  footerNote: { fontSize: 12, color: Colors.light.textSecondary },
});