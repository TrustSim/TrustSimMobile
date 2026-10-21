import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { BorderRadius, Colors, Spacing } from '../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  style,
  textStyle,
  ...props
}) => {
  const getVariantStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'accent':
        return {
          container: { backgroundColor: Colors.accent },
          text: { color: Colors.textInverse, fontWeight: '700' },
        };
      case 'success':
        return {
          container: { backgroundColor: Colors.success },
          text: { color: Colors.textInverse, fontWeight: '700' },
        };
      case 'danger':
        return {
          container: { backgroundColor: Colors.danger },
          text: { color: Colors.textInverse, fontWeight: '700' },
        };
      case 'secondary':
        return {
          container: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
          text: { color: Colors.text, fontWeight: '600' },
        };
      case 'outline':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
          text: { color: Colors.primary, fontWeight: '700' },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: Colors.primary, fontWeight: '600' },
        };
      case 'primary':
      default:
        return {
          container: { backgroundColor: Colors.primary },
          text: { color: Colors.textInverse, fontWeight: '700' },
        };
    }
  };

  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md },
          text: { fontSize: 13 },
        };
      case 'lg':
        return {
          container: { paddingVertical: Spacing.md + 4, paddingHorizontal: Spacing.xxl },
          text: { fontSize: 17 },
        };
      case 'md':
      default:
        return {
          container: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
          text: { fontSize: 15 },
        };
    }
  };

  const variantStyles = getVariantStyle();
  const sizeStyles = getSizeStyle();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.baseButton,
        variantStyles.container,
        sizeStyles.container,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.textInverse}
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.baseText, variantStyles.text, sizeStyles.text, !!icon && styles.textWithIcon, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  baseText: {
    textAlign: 'center',
  },
  textWithIcon: {
    marginLeft: Spacing.sm,
  },
  disabled: {
    opacity: 0.55,
  },
});
