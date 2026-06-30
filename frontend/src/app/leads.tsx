import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ScreenContent } from '@/components/screen-content';
import { ScreenShell } from '@/components/screen-shell';
import { Colors } from '@/constants/theme';
import { api, Job } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function LeadsScreen() {
  const { session, user, signInWithPhone } = useSession();
  const [openLeads, setOpenLeads] = useState<Job[]>([]);
  const [myLeads, setMyLeads] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [tab, setTab] = useState<'open' | 'mine'>('open');

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const open = await api.getOpenJobs();
      setOpenLeads(open);
      if (session?.userId && user?.is_provider) {
        const mine = await api.getProviderJobs(session.userId);
        setMyLeads(mine);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load jobs');
    } finally {
      setLoading(false);
    }
  }, [session?.userId, user?.is_provider]);

  useFocusEffect(useCallback(() => { loadLeads(); }, [loadLeads]));

  const becomeProvider = () => {
    Alert.alert(
      'Provider sign-in',
      'Sign in from the Profile tab with your phone number, then enable Provider mode.',
    );
  };

  const claimJob = (job: Job) => {
    if (!session?.userId) {
      becomeProvider();
      return;
    }
    if (!user?.is_provider) {
      Alert.alert('Provider account required', 'Enable provider mode in your Profile first.');
      return;
    }

    Alert.alert(
      'Claim this job?',
      `You'll get ${job.customer_name || 'the customer'}'s contact info to follow up.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim',
          onPress: async () => {
            setClaiming(job.id);
            try {
              const claimed = await api.claimJob(job.id, session.userId);
              Alert.alert(
                'Job claimed!',
                claimed.customer_phone
                  ? `Contact: ${claimed.customer_name} · ${claimed.customer_phone}`
                  : 'Check My jobs for details.'
              );
              setTab('mine');
              loadLeads();
            } catch (e: any) {
              Alert.alert('Could not claim', e.message);
            } finally {
              setClaiming(null);
            }
          },
        },
      ]
    );
  };

  const completeJob = async (job: Job) => {
    Alert.alert('Mark complete?', 'This unlocks mutual reviews for both parties.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await api.completeJob(job.id);
            loadLeads();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const leads = tab === 'open' ? openLeads : myLeads;

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLeads} />}
      >
        <ScreenContent>
        <Text style={styles.title}>Open Jobs</Text>
        <Text style={styles.subtitle}>
          Free exchange — claim a job, reach the customer, get it done.
        </Text>

        {!session && (
          <TouchableOpacity style={styles.signInBanner} onPress={becomeProvider}>
            <Text style={styles.signInText}>Sign in as a provider to claim jobs →</Text>
          </TouchableOpacity>
        )}

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'open' && styles.tabActive]}
            onPress={() => setTab('open')}
          >
            <Text style={[styles.tabText, tab === 'open' && styles.tabTextActive]}>
              Open ({openLeads.length})
            </Text>
          </TouchableOpacity>
          {user?.is_provider && (
            <TouchableOpacity
              style={[styles.tab, tab === 'mine' && styles.tabActive]}
              onPress={() => setTab('mine')}
            >
              <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>
                My jobs ({myLeads.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && leads.length === 0 ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 40 }} />
        ) : leads.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              {tab === 'open' ? 'No open jobs right now. Check back soon.' : 'No claimed jobs yet.'}
            </Text>
          </View>
        ) : (
          leads.map((job) => (
            <View key={job.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.serviceType}>{job.service_type}</Text>
                  <Text style={styles.customer}>
                    {job.status === 'open' ? 'Claim to see contact' : job.customer_name || 'Customer'}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{job.urgency}</Text>
                </View>
              </View>

              <Text style={styles.description}>{job.description}</Text>
              <Text style={styles.meta}>📍 {job.address}</Text>

              {job.customer_phone && (
                <TouchableOpacity
                  style={styles.contactBox}
                  onPress={() => Linking.openURL(`tel:${job.customer_phone!.replace(/\D/g, '')}`)}
                >
                  <Text style={styles.contactPhone}>📞 {job.customer_phone}</Text>
                </TouchableOpacity>
              )}

              {job.status === 'open' ? (
                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={() => claimJob(job)}
                  disabled={claiming === job.id}
                >
                  {claiming === job.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.claimText}>Claim job</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.claimedRow}>
                  <Text style={styles.statusLabel}>{job.status}</Text>
                  {job.status === 'claimed' && user?.is_provider && (
                    <TouchableOpacity style={styles.completeBtn} onPress={() => completeJob(job)}>
                      <Text style={styles.completeText}>Mark complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))
        )}
        </ScreenContent>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.light.primary },
  subtitle: { fontSize: 15, color: Colors.light.textSecondary, marginTop: 4, marginBottom: 20 },
  signInBanner: {
    backgroundColor: Colors.light.primary, borderRadius: 14, padding: 16, marginBottom: 16,
  },
  signInText: { color: '#fff', fontWeight: '600', fontSize: 15, textAlign: 'center' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.light.card,
    borderWidth: 1, borderColor: Colors.light.border, alignItems: 'center',
  },
  tabActive: { borderColor: Colors.light.primary, backgroundColor: '#E8F0E9' },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.light.textSecondary },
  tabTextActive: { color: Colors.light.primary },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  serviceType: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  customer: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 2 },
  badge: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: Colors.light.primary },
  description: { fontSize: 15, color: Colors.light.text, lineHeight: 22, marginTop: 12 },
  meta: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 10 },
  contactBox: {
    marginTop: 12, backgroundColor: '#E8F0E9', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.light.primary,
  },
  contactPhone: { fontSize: 17, fontWeight: '700', color: Colors.light.primary },
  claimBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  claimText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  claimedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  statusLabel: { fontSize: 14, fontWeight: '600', color: Colors.light.primary, textTransform: 'capitalize' },
  completeBtn: {
    backgroundColor: Colors.light.backgroundElement, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  completeText: { fontWeight: '600', color: Colors.light.primary },
});