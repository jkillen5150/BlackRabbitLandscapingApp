import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BackHeader } from '@/components/back-header';
import { ScreenContent } from '@/components/screen-content';
import { ScreenShell } from '@/components/screen-shell';
import { Card, PageSubtitle, PageTitle, Pill } from '@/components/ui/primitives';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, ProviderListing } from '@/lib/api';

export default function ProsScreen() {
  const [listings, setListings] = useState<ProviderListing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      setListings(await api.getProviderListings());
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [loadListings])
  );

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadListings} />}
      >
        <ScreenContent>
          <BackHeader />
          <PageTitle>Find a pro</PageTitle>
          <PageSubtitle>Local providers. Call them free.</PageSubtitle>

          {loading && listings.length === 0 ? (
            <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 40 }} />
          ) : listings.length === 0 ? (
            <Card style={{ marginTop: 24 }}>
              <Text style={styles.emptyTitle}>Quiet for now</Text>
              <Text style={styles.emptyText}>
                Pros list themselves under You. Or request Black Rabbit from Home.
              </Text>
            </Card>
          ) : (
            listings.map((listing) => (
              <Card key={listing.id} style={styles.card}>
                <Pill tone="green">{listing.service_type}</Pill>
                <Text style={styles.name}>{listing.provider_name}</Text>
                <Text style={styles.title}>{listing.title}</Text>
                <Text style={styles.desc}>{listing.description}</Text>
                <Text style={styles.area}>{listing.service_area}</Text>
                {listing.provider_phone ? (
                  <TouchableOpacity
                    style={styles.call}
                    onPress={() =>
                      Linking.openURL(`tel:${listing.provider_phone!.replace(/\D/g, '')}`)
                    }
                  >
                    <Text style={styles.callText}>Call {listing.provider_phone}</Text>
                  </TouchableOpacity>
                ) : null}
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
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22 },
  card: { marginTop: Spacing.four },
  name: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  title: { fontSize: 16, fontWeight: '500', color: Colors.light.text, marginTop: 8 },
  desc: { fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22, marginTop: 6 },
  area: { fontSize: 13, color: Colors.light.muted, marginTop: 12 },
  call: {
    marginTop: 16,
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  callText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
