import React from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useTopTabBarHeight } from '@/lib/use-top-tab-bar-height';

type ScreenShellProps = ViewProps & {
  children: React.ReactNode;
};

export function ScreenShell({ children, style, ...props }: ScreenShellProps) {
  const topPad = useTopTabBarHeight();

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.safeArea, { paddingTop: topPad }, style]}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
});