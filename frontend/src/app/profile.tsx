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
import { useFocusEffect } from 'expo-router';
import { ScreenContent } from '@/components/screen-content';
import { ScreenShell } from '@/components/screen-shell';
import { Colors } from '@/constants/theme';
import { api, Job, ProviderListing, Review } from '@/lib/api';
import { useSession } from '@/lib/session';

const APPEAL_REASONS = [
  'Billing dispute',
  'Service quality issue',
  'Communication problem',
  'Account restriction',
  'Other',
];

export default function ProfileScreen() {
  const { session, user, setSession, signInWithPhone, refreshUser } = useSession();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [services, setServices] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealSubject, setAppealSubject] = useState('');
  const [appealReason, setAppealReason] = useState(APPEAL_REASONS[0]);
  const [appealDetails, setAppealDetails] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [myListings, setMyListings] = useState<ProviderListing[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>(['Lawn Care', 'Handyman']);
  const [listingTitle, setListingTitle] = useState('');
  const [listingDesc, setListingDesc] = useState('');
  const [listingService, setListingService] = useState('Lawn Care');
  const [listingArea, setListingArea] = useState('Yelm, WA');
  const [creatingListing, setCreatingListing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!session?.userId) return;
    try {
      const [revs, customerJobs, providerJobs, listings] = await Promise.all([
        api.getUserReviews(session.userId),
        api.getCustomerJobs(session.userId),
        user?.is_provider ? api.getProviderJobs(session.userId) : Promise.resolve([]),
        user?.is_provider ? api.getMyListings(session.userId) : Promise.resolve([]),
      ]);
      setReviews(revs);
      setMyListings(listings);
      setJobs([...customerJobs, ...providerJobs.filter((j) => !customerJobs.find((c) => c.id === j.id))]);
    } catch {}
  }, [session?.userId, user?.is_provider]);

  useFocusEffect(
    useCallback(() => {
      api.getServiceTypes().then((d) => {
        setServiceTypes(d.types);
        if (d.types.length) setListingService(d.types[0]);
      }).catch(() => {});
    }, [])
  );

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  useFocusEffect(
    useCallback(() => {
      if (user) {
        setName(user.name);
        setBio(user.bio || '');
        setServices(user.services_offered || '');
      }
    }, [user])
  );

  const handleSignIn = async () => {
    if (!phone.trim() || !name.trim()) {
      Alert.alert('Enter your name and phone');
      return;
    }
    setSigningIn(true);
    try {
      await signInWithPhone(phone.trim(), name.trim(), false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSigningIn(false);
    }
  };

  const toggleProvider = async (value: boolean) => {
    if (!session) return;
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
      Alert.alert('Saved', 'Profile updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const publishListing = async () => {
    if (!session?.userId || !listingTitle.trim() || !listingDesc.trim()) {
      Alert.alert('Fill in a headline and description');
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
      loadProfile();
      Alert.alert('Listed!', 'Customers can find you in the Pros tab and call you directly.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreatingListing(false);
    }
  };

  const toggleListingStatus = async (listing: ProviderListing) => {
    const newStatus = listing.status === 'active' ? 'paused' : 'active';
    try {
      await api.updateProviderListing(listing.id, { status: newStatus });
      loadProfile();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const submitAppeal = async () => {
    if (!session || !appealSubject.trim() || !appealDetails.trim()) {
      Alert.alert('Fill in subject and details');
      return;
    }
    setSubmittingAppeal(true);
    try {
      await api.createAppeal({
        reporter_id: session.userId,
        subject: appealSubject,
        reason: appealReason,
        details: appealDetails,
      });
      setShowAppeal(false);
      setAppealSubject('');
      setAppealDetails('');
      Alert.alert(
        'Appeal submitted',
        'A real person will review this. We reconcile disputes — we don\'t auto-ban.',
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const submitReview = async () => {
    if (!session || !reviewJob) return;
    const revieweeId =
      session.userId === reviewJob.customer_id
        ? reviewJob.provider_id
        : reviewJob.customer_id;
    if (!revieweeId) return;

    try {
      await api.createReview({
        job_id: reviewJob.id,
        reviewer_id: session.userId,
        reviewee_id: revieweeId,
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      setReviewJob(null);
      setReviewComment('');
      loadProfile();
      Alert.alert('Thanks', 'Your review helps the community.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const completedJobsNeedingReview = jobs.filter(
    (j) =>
      j.status === 'completed' &&
      (j.customer_id === session?.userId || j.provider_id === session?.userId)
  );

  if (!session) {
    return (
      <ScreenShell>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ScreenContent>
          <Text style={styles.title}>Your Profile</Text>
          <Text style={styles.subtitle}>Sign in with your phone. No password needed.</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#8A958B" />
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="(360) 555-1234" keyboardType="phone-pad" placeholderTextColor="#8A958B" />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} disabled={signingIn}>
              {signingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Continue</Text>}
            </TouchableOpacity>
          </View>
          </ScreenContent>
        </ScrollView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScreenContent>
        <View style={styles.profileHeader}>
          <Text style={styles.title}>{user?.name}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          {user?.avg_rating ? (
            <Text style={styles.rating}>★ {user.avg_rating} ({user.review_count} reviews)</Text>
          ) : (
            <Text style={styles.ratingMuted}>No reviews yet</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Provider mode</Text>
              <Text style={styles.switchHint}>Claim jobs · list yourself in Pros</Text>
            </View>
            <Switch
              value={user?.is_provider ?? false}
              onValueChange={toggleProvider}
              trackColor={{ true: Colors.light.primary }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={bio}
            onChangeText={setBio}
            placeholder="A sentence about you and your work"
            placeholderTextColor="#8A958B"
            multiline
          />
          {user?.is_provider && (
            <>
              <Text style={styles.label}>Services offered</Text>
              <TextInput
                style={styles.input}
                value={services}
                onChangeText={setServices}
                placeholder="Lawn Care, Handyman, etc."
                placeholderTextColor="#8A958B"
              />
            </>
          )}
          <TouchableOpacity style={styles.primaryBtn} onPress={saveProfile}>
            <Text style={styles.primaryBtnText}>Save profile</Text>
          </TouchableOpacity>
        </View>

        {user?.is_provider && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>List your services</Text>
            <Text style={styles.listingHint}>
              Show up in the Pros tab so customers can find and contact you directly. Free for now.
            </Text>

            <Text style={styles.label}>Headline</Text>
            <TextInput
              style={styles.input}
              value={listingTitle}
              onChangeText={setListingTitle}
              placeholder="Reliable weekly lawn care in Yelm"
              placeholderTextColor="#8A958B"
            />
            <Text style={styles.label}>Your pitch</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={listingDesc}
              onChangeText={setListingDesc}
              placeholder="What you do, your experience, what makes you different"
              placeholderTextColor="#8A958B"
              multiline
            />
            <Text style={styles.label}>Service type</Text>
            <View style={styles.chipRow}>
              {serviceTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, listingService === type && styles.chipActive]}
                  onPress={() => setListingService(type)}
                >
                  <Text style={[styles.chipText, listingService === type && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Service area</Text>
            <TextInput
              style={styles.input}
              value={listingArea}
              onChangeText={setListingArea}
              placeholder="Yelm, WA"
              placeholderTextColor="#8A958B"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={publishListing} disabled={creatingListing}>
              {creatingListing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Publish listing</Text>
              )}
            </TouchableOpacity>

            {myListings.length > 0 && (
              <View style={styles.myListings}>
                <Text style={styles.label}>Your listings</Text>
                {myListings.map((l) => (
                  <View key={l.id} style={styles.listingItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listingItemTitle}>{l.title}</Text>
                      <Text style={styles.listingItemMeta}>
                        {l.service_type} · {l.status}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleListingStatus(l)}>
                      <Text style={styles.listingToggle}>
                        {l.status === 'active' ? 'Pause' : 'Activate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {completedJobsNeedingReview.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Leave a review</Text>
            {reviewJob ? (
              <View>
                <Text style={styles.reviewJobTitle}>{reviewJob.service_type} — {reviewJob.title}</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity key={n} onPress={() => setReviewRating(n)}>
                      <Text style={styles.star}>{n <= reviewRating ? '★' : '☆'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="Optional comment"
                  placeholderTextColor="#8A958B"
                  multiline
                />
                <View style={styles.row}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setReviewJob(null)}>
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={submitReview}>
                    <Text style={styles.primaryBtnText}>Submit review</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              completedJobsNeedingReview.map((j) => (
                <TouchableOpacity key={j.id} style={styles.reviewItem} onPress={() => setReviewJob(j)}>
                  <Text style={styles.reviewItemText}>Review: {j.service_type}</Text>
                  <Text style={styles.reviewArrow}>→</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {reviews.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Reviews about you</Text>
            {reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <Text style={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                <Text style={styles.reviewAuthor}>{r.reviewer_name}</Text>
                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Appeals & disputes</Text>
          <Text style={styles.appealHint}>
            Something wrong? File an appeal. We review cases fairly — no instant bans.
          </Text>
          {!showAppeal ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowAppeal(true)}>
              <Text style={styles.secondaryBtnText}>File an appeal</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.label}>Subject</Text>
              <TextInput style={styles.input} value={appealSubject} onChangeText={setAppealSubject} placeholder="Brief summary" placeholderTextColor="#8A958B" />
              <Text style={styles.label}>Reason</Text>
              <View style={styles.reasonRow}>
                {APPEAL_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.reasonChip, appealReason === r && styles.reasonChipActive]}
                    onPress={() => setAppealReason(r)}
                  >
                    <Text style={[styles.reasonText, appealReason === r && styles.reasonTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Details</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={appealDetails}
                onChangeText={setAppealDetails}
                placeholder="Tell us what happened"
                placeholderTextColor="#8A958B"
                multiline
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={submitAppeal} disabled={submittingAppeal}>
                {submittingAppeal ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Submit appeal</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.premiumCard}>
          <Text style={styles.premiumTitle}>Ad-free premium</Text>
          <Text style={styles.premiumHint}>
            Coming soon — support the app and browse without ads. Everything stays free for now.
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={() => setSession(null)}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
        </ScreenContent>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.light.primary },
  subtitle: { fontSize: 15, color: Colors.light.textSecondary, marginTop: 4, marginBottom: 20 },
  profileHeader: { marginBottom: 20 },
  phone: { fontSize: 15, color: Colors.light.textSecondary, marginTop: 2 },
  rating: { fontSize: 16, fontWeight: '600', color: Colors.light.accent, marginTop: 6 },
  ratingMuted: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 6 },
  card: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: Colors.light.background, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.light.border, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: Colors.light.text,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  primaryBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 14, flex: 1,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 10, flex: 1,
  },
  secondaryBtnText: { color: Colors.light.primary, fontWeight: '600', fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  switchHint: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  reviewItem: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  reviewItemText: { fontSize: 15, color: Colors.light.text },
  reviewArrow: { fontSize: 18, color: Colors.light.primary },
  reviewJobTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  star: { fontSize: 32, color: Colors.light.accent },
  row: { flexDirection: 'row', gap: 10 },
  reviewCard: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  reviewStars: { fontSize: 16, color: Colors.light.accent },
  reviewAuthor: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginTop: 4 },
  reviewComment: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 4 },
  appealHint: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 12, lineHeight: 20 },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  reasonChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.light.backgroundElement, borderWidth: 1, borderColor: Colors.light.border,
  },
  reasonChipActive: { borderColor: Colors.light.primary, backgroundColor: '#E8F0E9' },
  reasonText: { fontSize: 13, color: Colors.light.textSecondary },
  reasonTextActive: { color: Colors.light.primary, fontWeight: '600' },
  premiumCard: {
    backgroundColor: '#F5F0E4', borderRadius: 16, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.light.border, borderStyle: 'dashed',
  },
  premiumTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  premiumHint: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 6, lineHeight: 20 },
  signOutBtn: { alignItems: 'center', paddingVertical: 16 },
  signOutText: { color: Colors.light.textSecondary, fontWeight: '600' },
  listingHint: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 12, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.light.backgroundElement, borderWidth: 1, borderColor: Colors.light.border,
  },
  chipActive: { borderColor: Colors.light.primary, backgroundColor: '#E8F0E9' },
  chipText: { fontSize: 13, color: Colors.light.textSecondary },
  chipTextActive: { color: Colors.light.primary, fontWeight: '600' },
  myListings: { marginTop: 16 },
  listingItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  listingItemTitle: { fontSize: 15, fontWeight: '600', color: Colors.light.text },
  listingItemMeta: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  listingToggle: { color: Colors.light.primary, fontWeight: '600', fontSize: 14 },
});