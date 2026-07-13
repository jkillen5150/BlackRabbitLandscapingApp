import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContent } from '@/components/screen-content';
import { ScreenShell } from '@/components/screen-shell';
import { Button, Card, PageSubtitle, PageTitle, SectionLabel } from '@/components/ui/primitives';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { OWNER } from '@/lib/business';
import { api, Job, ProviderListing } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, user, setSession, signInWithEmail, refreshUser } = useSession();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [signUpAsProvider, setSignUpAsProvider] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'details' | 'code'>('details');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [bio, setBio] = useState('');
  const [services, setServices] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myListings, setMyListings] = useState<ProviderListing[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>(['Lawn Care']);
  const [listingTitle, setListingTitle] = useState('');
  const [listingDesc, setListingDesc] = useState('');
  const [listingService, setListingService] = useState('Lawn Care');
  const [listingArea, setListingArea] = useState('Yelm, WA');
  const [creatingListing, setCreatingListing] = useState(false);
  const [showProSetup, setShowProSetup] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!session?.userId) return;
    try {
      const [customerJobs, providerJobs, listings] = await Promise.all([
        api.getCustomerJobs(session.userId),
        user?.is_provider ? api.getProviderJobs(session.userId) : Promise.resolve([]),
        user?.is_provider ? api.getMyListings(session.userId) : Promise.resolve([]),
      ]);
      setMyListings(listings);
      setJobs([
        ...customerJobs,
        ...providerJobs.filter((j) => !customerJobs.find((c) => c.id === j.id)),
      ]);
    } catch {}
  }, [session?.userId, user?.is_provider]);

  useFocusEffect(
    useCallback(() => {
      api
        .getServiceTypes()
        .then((d) => {
          setServiceTypes(d.types);
          if (d.types.length) setListingService(d.types[0]);
        })
        .catch(() => {});
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        setName(user.name);
        setBio(user.bio || '');
        setServices(user.services_offered || '');
      }
    }, [user])
  );

  const handleRequestCode = async () => {
    if (!email.trim() || !name.trim() || !phone.trim()) {
      Alert.alert('Almost there', 'Enter name, email, and phone.');
      return;
    }
    setSigningIn(true);
    try {
      const result = await api.requestEmailCode({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone.trim(),
        is_provider: signUpAsProvider,
      });
      setPendingEmail(result.email);
      setDevCodeHint(result.demo_mode && result.dev_code ? result.dev_code : null);
      setVerificationStep('code');
      setVerificationCode('');
    } catch (e: any) {
      Alert.alert('Could not send code', e.message);
    } finally {
      setSigningIn(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.trim().length !== 6) {
      Alert.alert('Enter the 6-digit code');
      return;
    }
    setSigningIn(true);
    try {
      await signInWithEmail(pendingEmail || email.trim().toLowerCase(), verificationCode.trim());
      setVerificationStep('details');
      setVerificationCode('');
      setDevCodeHint(null);
    } catch (e: any) {
      Alert.alert('Verification failed', e.message);
    } finally {
      setSigningIn(false);
    }
  };

  const toggleProvider = async (value: boolean) => {
    if (!session) return;
    if (value && !user?.email_verified) {
      Alert.alert('Verify email first', 'Email verification is required for provider mode.');
      return;
    }
    try {
      await api.updateUser(session.userId, { is_provider: value });
      await refreshUser();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const saveProfile = async () => {
    if (!session) return;
    try {
      await api.updateUser(session.userId, {
        name,
        bio,
        services_offered: services,
      });
      await refreshUser();
      Alert.alert('Saved');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const publishListing = async () => {
    if (!session?.userId || !listingTitle.trim() || !listingDesc.trim()) {
      Alert.alert('Add a headline and description');
      return;
    }
    setCreatingListing(true);
    try {
      await api.createProviderListing({
        provider_id: session.userId,
        title: listingTitle.trim(),
        description: listingDesc.trim(),
        service_type: listingService,
        service_area: listingArea.trim() || 'Yelm, WA',
      });
      setListingTitle('');
      setListingDesc('');
      setShowProSetup(false);
      loadProfile();
      Alert.alert('Listed', 'You appear under Find pros.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreatingListing(false);
    }
  };

  if (!session) {
    return (
      <ScreenShell>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenContent>
            <PageTitle>You</PageTitle>
            <PageSubtitle>Sign in to track requests. Optional for posting from Home.</PageSubtitle>

            <Card style={styles.card}>
              {verificationStep === 'details' ? (
                <>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={Colors.light.muted}
                  />
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.light.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="(360) 555-1234"
                    placeholderTextColor={Colors.light.muted}
                    keyboardType="phone-pad"
                  />
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>I'm a provider</Text>
                    <Switch
                      value={signUpAsProvider}
                      onValueChange={setSignUpAsProvider}
                      trackColor={{ true: Colors.light.primary }}
                    />
                  </View>
                  <Button
                    title="Continue"
                    onPress={handleRequestCode}
                    loading={signingIn}
                    style={{ marginTop: 16 }}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.hint}>Code sent to {pendingEmail || email}</Text>
                  {devCodeHint ? (
                    <Text style={styles.devCode}>Demo code: {devCodeHint}</Text>
                  ) : null}
                  <Text style={styles.label}>Code</Text>
                  <TextInput
                    style={styles.input}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="123456"
                    placeholderTextColor={Colors.light.muted}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button
                    title="Verify"
                    onPress={handleVerifyCode}
                    loading={signingIn}
                    style={{ marginTop: 16 }}
                  />
                  <TouchableOpacity
                    onPress={() => setVerificationStep('details')}
                    style={styles.textBtn}
                  >
                    <Text style={styles.textBtnLabel}>Back</Text>
                  </TouchableOpacity>
                </>
              )}
            </Card>
          </ScreenContent>
        </ScrollView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenContent>
          <PageTitle>{user?.name || 'You'}</PageTitle>
          <PageSubtitle>
            {[user?.email, user?.phone].filter(Boolean).join(' · ')}
          </PageSubtitle>

          {/* Quiet tools — not in the dock */}
          <View style={styles.linkList}>
            <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/leads')}>
              <Text style={styles.linkTitle}>Open jobs</Text>
              <Text style={styles.linkChevron}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/pros')}>
              <Text style={styles.linkTitle}>Find pros</Text>
              <Text style={styles.linkChevron}>→</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Provider mode</Text>
                <Text style={styles.switchHint}>Claim jobs and list yourself</Text>
              </View>
              <Switch
                value={user?.is_provider ?? false}
                onValueChange={toggleProvider}
                trackColor={{ true: Colors.light.primary }}
              />
            </View>
          </Card>

          {jobs.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel>Your requests</SectionLabel>
              {jobs.slice(0, 5).map((j) => (
                <View key={j.id} style={styles.jobRow}>
                  <Text style={styles.jobTitle} numberOfLines={1}>
                    {j.service_type}
                  </Text>
                  <Text style={styles.jobStatus}>
                    {j.status === 'owner_direct' ? 'Black Rabbit' : j.status}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Card style={styles.card}>
            <SectionLabel>Profile</SectionLabel>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholderTextColor={Colors.light.muted}
            />
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Optional"
              placeholderTextColor={Colors.light.muted}
              multiline
            />
            {user?.is_provider ? (
              <>
                <Text style={styles.label}>Services</Text>
                <TextInput
                  style={styles.input}
                  value={services}
                  onChangeText={setServices}
                  placeholder="Lawn Care, Handyman…"
                  placeholderTextColor={Colors.light.muted}
                />
              </>
            ) : null}
            <Button title="Save" onPress={saveProfile} style={{ marginTop: 16 }} />
          </Card>

          {user?.is_provider ? (
            <Card style={styles.card}>
              <SectionLabel>Pro listing</SectionLabel>
              {myListings.length > 0 ? (
                myListings.map((l) => (
                  <View key={l.id} style={styles.jobRow}>
                    <Text style={styles.jobTitle}>{l.title}</Text>
                    <Text style={styles.jobStatus}>{l.status}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.hint}>No listing yet. Customers find you under Find pros.</Text>
              )}
              <TouchableOpacity onPress={() => setShowProSetup((v) => !v)} style={styles.textBtn}>
                <Text style={styles.textBtnLabel}>
                  {showProSetup ? 'Cancel' : 'Add listing'}
                </Text>
              </TouchableOpacity>
              {showProSetup ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Headline</Text>
                  <TextInput
                    style={styles.input}
                    value={listingTitle}
                    onChangeText={setListingTitle}
                    placeholder="Weekly lawn care in Yelm"
                    placeholderTextColor={Colors.light.muted}
                  />
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={listingDesc}
                    onChangeText={setListingDesc}
                    placeholder="What you offer"
                    placeholderTextColor={Colors.light.muted}
                    multiline
                  />
                  <Text style={styles.label}>Service</Text>
                  <View style={styles.chipRow}>
                    {serviceTypes.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.miniChip, listingService === t && styles.miniChipOn]}
                        onPress={() => setListingService(t)}
                      >
                        <Text
                          style={[styles.miniChipText, listingService === t && styles.miniChipTextOn]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.label}>Area</Text>
                  <TextInput
                    style={styles.input}
                    value={listingArea}
                    onChangeText={setListingArea}
                    placeholderTextColor={Colors.light.muted}
                  />
                  <Button
                    title="Publish"
                    onPress={publishListing}
                    loading={creatingListing}
                    style={{ marginTop: 16 }}
                  />
                </View>
              ) : null}
            </Card>
          ) : null}

          <TouchableOpacity
            style={styles.signOut}
            onPress={() => setSession(null)}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            {OWNER.brand} · {OWNER.phoneDisplay}
          </Text>
        </ScreenContent>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.seven,
  },
  card: { marginTop: Spacing.five },
  section: { marginTop: Spacing.six },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.muted,
    marginTop: 14,
    marginBottom: 8,
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
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  switchLabel: { fontSize: 16, fontWeight: '500', color: Colors.light.text },
  switchHint: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  hint: { fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  devCode: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.accent,
  },
  linkList: {
    marginTop: Spacing.five,
    backgroundColor: Colors.light.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  linkTitle: { fontSize: 16, fontWeight: '500', color: Colors.light.text },
  linkChevron: { fontSize: 16, color: Colors.light.muted },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 12,
  },
  jobTitle: { flex: 1, fontSize: 15, color: Colors.light.text, fontWeight: '500' },
  jobStatus: { fontSize: 13, color: Colors.light.textSecondary, textTransform: 'capitalize' },
  textBtn: { marginTop: 12, paddingVertical: 8 },
  textBtnLabel: { fontSize: 15, fontWeight: '600', color: Colors.light.primaryLight },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniChip: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.light.card,
  },
  miniChipOn: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.softGreen,
  },
  miniChipText: { fontSize: 13, color: Colors.light.text },
  miniChipTextOn: { color: Colors.light.primary, fontWeight: '600' },
  signOut: { marginTop: Spacing.six, alignItems: 'center', padding: 12 },
  signOutText: { fontSize: 15, color: Colors.light.muted, fontWeight: '500' },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.light.muted,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
});
