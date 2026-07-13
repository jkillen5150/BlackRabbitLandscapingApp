import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TopTabBar } from '@/components/top-tab-bar';
import { SessionProvider } from '@/lib/session';

function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TopTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      {/* Dock: Home + You only */}
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
      {/* Reachable routes, not in dock */}
      <Tabs.Screen name="pros" options={{ href: null, title: 'Pros' }} />
      <Tabs.Screen name="leads" options={{ href: null, title: 'Jobs' }} />
      <Tabs.Screen name="chat" options={{ href: null, title: 'Grok' }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <TabLayout />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
