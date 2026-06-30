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
import { ScreenContent } from '@/components/screen-content';
import { ScreenShell } from '@/components/screen-shell';
import { Colors } from '@/constants/theme';
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

  useFocusEffect(useCallback(() => { loadListings(); }, [loadListings]));

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadListings} />}
      >
        <ScreenContent>
        <Text style={styles.title}>Find a Pro</Text>
        <Text style={styles.subtitle}>
          Local providers listing their services. Contact them directly — it's free.
        </Text>

        {loading && listings.length === 0 ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 40 }} />
        ) : listings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👷</Text>
            <Text style={styles.emptyText}>No listings yet. Providers can add one in Profile.</Text>
          </View>
        ) : (
          listings.map((listing) => (
            <View key={listing.id} style={styles.card}>
              <Text style={styles.serviceType}>{listing.service_type}</Text>
              <Text style={styles.providerName}>{listing.provider_name}</Text>
              {listing.avg_rating ? (
                <Text style={styles.rating}>★ {listing.avg_rating} ({listing.review_count} reviews)</Text>
              ) : null}

              <Text style={styles.listingTitle}>{listing.title}</Text>
              <Text style={styles.description}>{listing.description}</Text>
              <Text style={styles.area}>📍 {listing.service_area}</Text>

              {listing.provider_phone ? (
                <TouchableOpacity
                  style={styles.contactBox}
                  onPress={() => Linking.openURL(`tel:${listing.provider_phone!.replace(/\D/g, '')}`)}
                >
                  <Text style={styles.contactPhone}>📞 {listing.provider_phone}</Text>
                </TouchableOpacity>
              ) : null}
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
  subtitle: { fontSize: 15, color: Colors.light.textSecondary, marginTop: 4, marginBottom: 16 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  serviceType: { fontSize: 13, fontWeight: '600', color: Colors.light.primaryLight },
  providerName: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginTop: 2 },
  rating: { fontSize: 14, color: Colors.light.accent, marginTop: 4 },
  listingTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginTop: 12 },
  description: { fontSize: 15, color: Colors.light.text, lineHeight: 22, marginTop: 6 },
  area: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 10 },
  contactBox: {
    marginTop: 14, backgroundColor: '#E8F0E9', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.light.primary, alignItems: 'center',
  },
  contactPhone: { fontSize: 18, fontWeight: '700', color: Colors.light.primary },
});