import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TopTabBar } from '@/components/top-tab-bar';
import { SessionProvider } from '@/lib/session';

function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TopTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Post' }} />
      <Tabs.Screen name="pros" options={{ title: 'Pros' }} />
      <Tabs.Screen name="leads" options={{ title: 'Jobs' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
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