import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing } from '../constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'elevated', ...props }) => {
  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
        variant === 'flat' && styles.flat,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  elevated: {
    ...Shadows.card,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.7)',
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  flat: {
    backgroundColor: Colors.surfaceAlt,
  },
});
