import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useBottomNavClearance } from '@/lib/use-top-tab-bar-height';

type ScreenShellProps = ViewProps & {
  children: React.ReactNode;
  /** Extra bottom space for sticky CTAs above the nav */
  extraBottom?: number;
};

export function ScreenShell({ children, style, extraBottom = 0, ...props }: ScreenShellProps) {
  const bottomPad = useBottomNavClearance() + extraBottom;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, style]} {...props}>
      <View style={[styles.inner, { paddingBottom: bottomPad }]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  inner: { flex: 1 },
});
