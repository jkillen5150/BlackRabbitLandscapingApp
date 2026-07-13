import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';

export function BackHeader({ title }: { title?: string }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={12}
        style={styles.backBtn}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      {title ? <Text style={styles.title}>{title}</Text> : <View style={{ flex: 1 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: 12,
  },
  backBtn: { paddingVertical: 4 },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primaryLight,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textAlign: 'right',
  },
});
