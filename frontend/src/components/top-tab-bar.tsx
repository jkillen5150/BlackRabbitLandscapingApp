import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAV_HEIGHT, Colors, HIDDEN_TAB_ROUTES, Radius, Shadows } from '@/constants/theme';

export const TOP_TAB_BAR_HEIGHT = APP_NAV_HEIGHT;

const TAB_META: Record<string, { label: string }> = {
  index: { label: 'Home' },
  profile: { label: 'You' },
};

type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

/** Minimal dock — Home + You only. */
export function TopTabBar({ state, descriptors, navigation }: TabBarProps) {
  const routes = state.routes.filter((r) => !HIDDEN_TAB_ROUTES.has(r.name));
  // Focus index among visible routes
  const focusedName = state.routes[state.index]?.name;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <View style={[styles.bar, Shadows.soft]}>
          {routes.map((route) => {
            const meta = TAB_META[route.name] ?? {
              label: String(descriptors[route.key]?.options?.title ?? route.name),
            };
            const isFocused = focusedName === route.name;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={meta.label}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                style={[styles.tab, isFocused && styles.tabFocused]}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  bar: {
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'web' ? 16 : 8,
    backgroundColor: Colors.light.card,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    minHeight: APP_NAV_HEIGHT - 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.pill,
  },
  tabFocused: {
    backgroundColor: Colors.light.primary,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.muted,
    letterSpacing: 0.2,
  },
  tabLabelFocused: {
    color: Colors.light.onPrimary,
    fontWeight: '700',
  },
});
