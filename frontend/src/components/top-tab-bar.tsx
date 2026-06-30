import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export const TOP_TAB_BAR_HEIGHT = 66;

export function TopTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.bar}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand} numberOfLines={1}>
              🐇 Black Rabbit
            </Text>
            <Text style={styles.brandSub} numberOfLines={1}>
              Yelm, WA · Local Services
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
            style={styles.tabsScroll}
          >
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const label = options.title ?? route.name;
              const isFocused = state.index === index;

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
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
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  safeArea: {
    backgroundColor: Colors.light.card,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOP_TAB_BAR_HEIGHT,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  brandBlock: {
    flexShrink: 0,
    maxWidth: 150,
  },
  brand: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primary,
    letterSpacing: -0.2,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  tabsScroll: {
    flex: 1,
    flexGrow: 1,
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingLeft: 4,
    minWidth: '100%',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  tabFocused: {
    backgroundColor: '#E8F0E9',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  tabLabelFocused: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
});