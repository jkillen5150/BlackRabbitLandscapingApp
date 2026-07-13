import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type ViewProps,
  type TextProps,
  type TouchableOpacityProps,
} from 'react-native';
import { Colors, Radius, Shadows, Spacing, Type } from '@/constants/theme';

export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.card, Shadows.card, style]} {...props}>
      {children}
    </View>
  );
}

export function SoftCard({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.softCard, style]} {...props}>
      {children}
    </View>
  );
}

export function SectionLabel({ children, style, ...props }: TextProps) {
  return (
    <Text style={[styles.sectionLabel, style]} {...props}>
      {children}
    </Text>
  );
}

export function PageTitle({ children, style, ...props }: TextProps) {
  return (
    <Text style={[styles.pageTitle, style]} {...props}>
      {children}
    </Text>
  );
}

export function PageSubtitle({ children, style, ...props }: TextProps) {
  return (
    <Text style={[styles.pageSubtitle, style]} {...props}>
      {children}
    </Text>
  );
}

type BtnProps = TouchableOpacityProps & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({
  title,
  loading,
  variant = 'primary',
  disabled,
  style,
  ...props
}: BtnProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[
        styles.btn,
        isPrimary && styles.btnPrimary,
        isSecondary && styles.btnSecondary,
        variant === 'ghost' && styles.btnGhost,
        (disabled || loading) && styles.btnDisabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? Colors.light.onPrimary : Colors.light.primary} />
      ) : (
        <Text
          style={[
            styles.btnText,
            isPrimary && styles.btnTextPrimary,
            (isSecondary || variant === 'ghost') && styles.btnTextSecondary,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

type ChipProps = TouchableOpacityProps & {
  label: string;
  selected?: boolean;
  hint?: string;
};

export function Chip({ label, selected, hint, style, ...props }: ChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.chip, selected && styles.chipSelected, style]}
      {...props}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
      {hint ? (
        <Text style={[styles.chipHint, selected && styles.chipLabelSelected]}>{hint}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'green' | 'gold';
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'green' && styles.pillGreen,
        tone === 'gold' && styles.pillGold,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          tone === 'green' && styles.pillTextGreen,
          tone === 'gold' && styles.pillTextGold,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.five,
  },
  softCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  sectionLabel: {
    fontSize: Type.label,
    fontWeight: '600',
    color: Colors.light.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
  },
  pageTitle: {
    fontSize: Type.hero,
    fontWeight: '600',
    color: Colors.light.text,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  pageSubtitle: {
    fontSize: Type.body,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.two,
  },
  btn: {
    borderRadius: Radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnPrimary: {
    backgroundColor: Colors.light.primary,
  },
  btnSecondary: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  btnTextPrimary: {
    color: Colors.light.onPrimary,
  },
  btnTextSecondary: {
    color: Colors.light.primary,
  },
  chip: {
    backgroundColor: Colors.light.card,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chipSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.softGreen,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    textAlign: 'center',
  },
  chipLabelSelected: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  chipHint: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillGreen: {
    backgroundColor: Colors.light.softGreen,
  },
  pillGold: {
    backgroundColor: Colors.light.softGold,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  pillTextGreen: {
    color: Colors.light.primaryLight,
  },
  pillTextGold: {
    color: Colors.light.accent,
  },
});
