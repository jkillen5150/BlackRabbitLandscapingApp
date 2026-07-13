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
import { BackHeader } from '@/components/back-header';
import { ScreenContent } from '@/components/screen-content';
import { ScreenShell } from '@/components/screen-shell';
import { Button, Card, PageSubtitle, PageTitle, Pill } from '@/components/ui/primitives';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, Job } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function LeadsScreen() {
  const { session, user } = useSession();
  const [openLeads, setOpenLeads] = useState<Job[]>([]);
  const [myLeads, setMyLeads] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [tab, setTab] = useState<'open' | 'mine'>('open');

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      setOpenLeads(await api.getOpenJobs());
      if (session?.userId && user?.is_provider) {
        setMyLeads(await api.getProviderJobs(session.userId));
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load jobs');
    } finally {
      setLoading(false);
    }
  }, [session?.userId, user?.is_provider]);

  useFocusEffect(
    useCallback(() => {
      loadLeads();
    }, [loadLeads])
  );

  const claimJob = (job: Job) => {
    if (!session?.userId || !user?.email_verified || !user?.is_provider) {
      Alert.alert('Provider access', 'Enable provider mode under You, with a verified email.');
      return;
    }
    Alert.alert('Claim this job?', `Contact: ${job.customer_name || 'customer'} after claim.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Claim',
        onPress: async () => {
          setClaiming(job.id);
          try {
            const claimed = await api.claimJob(job.id, session.userId);
            Alert.alert(
              'Claimed',
              claimed.customer_phone
                ? `${claimed.customer_name} · ${claimed.customer_phone}`
                : 'See My jobs.'
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
    ]);
  };

  const leads = tab === 'open' ? openLeads : myLeads;

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLeads} />}
      >
        <ScreenContent>
          <BackHeader />
          <PageTitle>Jobs</PageTitle>
          <PageSubtitle>Open board for pros. Claim free.</PageSubtitle>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'open' && styles.tabOn]}
              onPress={() => setTab('open')}
            >
              <Text style={[styles.tabText, tab === 'open' && styles.tabTextOn]}>
                Open · {openLeads.length}
              </Text>
            </TouchableOpacity>
            {user?.is_provider ? (
              <TouchableOpacity
                style={[styles.tab, tab === 'mine' && styles.tabOn]}
                onPress={() => setTab('mine')}
              >
                <Text style={[styles.tabText, tab === 'mine' && styles.tabTextOn]}>
                  Mine · {myLeads.length}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loading && leads.length === 0 ? (
            <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 40 }} />
          ) : leads.length === 0 ? (
            <Card>
              <Text style={styles.empty}>
                {tab === 'open' ? 'No open jobs right now.' : 'No claimed jobs yet.'}
              </Text>
            </Card>
          ) : (
            leads.map((job) => (
              <Card key={job.id} style={styles.card}>
                <View style={styles.head}>
                  <Text style={styles.service}>{job.service_type}</Text>
                  <Pill tone="gold">{job.urgency}</Pill>
                </View>
                <Text style={styles.desc}>{job.description}</Text>
                <Text style={styles.meta}>{job.address}</Text>
                {job.customer_phone ? (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(`tel:${job.customer_phone!.replace(/\D/g, '')}`)
                    }
                    style={styles.phone}
                  >
                    <Text style={styles.phoneText}>{job.customer_phone}</Text>
                  </TouchableOpacity>
                ) : null}
                {job.status === 'open' ? (
                  <Button
                    title="Claim"
                    onPress={() => claimJob(job)}
                    loading={claiming === job.id}
                    style={{ marginTop: 16 }}
                  />
                ) : (
                  <Text style={styles.status}>{job.status}</Text>
                )}
              </Card>
            ))
          )}
        </ScreenContent>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.seven,
  },
  tabs: { flexDirection: 'row', gap: 8, marginVertical: Spacing.five },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    alignItems: 'center',
  },
  tabOn: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.light.textSecondary },
  tabTextOn: { color: '#fff' },
  empty: { fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22 },
  card: { marginBottom: Spacing.three },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  service: { fontSize: 18, fontWeight: '600', color: Colors.light.text, flex: 1 },
  desc: { fontSize: 15, color: Colors.light.text, lineHeight: 22, marginTop: 12 },
  meta: { fontSize: 13, color: Colors.light.muted, marginTop: 10 },
  phone: { marginTop: 12 },
  phoneText: { fontSize: 16, fontWeight: '600', color: Colors.light.primaryLight },
  status: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primaryLight,
    textTransform: 'capitalize',
  },
});
