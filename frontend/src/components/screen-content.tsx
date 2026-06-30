import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { MaxContentWidth } from '@/constants/theme';

type ScreenContentProps = ViewProps & {
  children: React.ReactNode;
};

export function ScreenContent({ children, style, ...props }: ScreenContentProps) {
  return (
    <View style={[styles.wrapper, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});