import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing } from '../constants/theme';

export type NavTabId = 'home' | 'sims' | 'wallet' | 'account' | 'none';

interface BottomNavBarProps {
  activeTab?: NavTabId;
  style?: ViewStyle;
}

interface TabConfig {
  id: NavTabId;
  label: string;
  route: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  {
    id: 'home',
    label: 'Trang Chủ',
    route: '/(tabs)',
    iconActive: 'home',
    iconInactive: 'home-outline',
  },
  {
    id: 'sims',
    label: 'Kho SIM',
    route: '/(tabs)/sims',
    iconActive: 'phone-portrait',
    iconInactive: 'phone-portrait-outline',
  },
  {
    id: 'wallet',
    label: 'Ví Tiền',
    route: '/(tabs)/wallet',
    iconActive: 'wallet',
    iconInactive: 'wallet-outline',
  },
  {
    id: 'account',
    label: 'Cá Nhân',
    route: '/(tabs)/account',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab = 'none',
  style,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleTabPress = (route: string) => {
    router.replace(route as any);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
        style,
      ]}
    >
      <View style={styles.innerRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const iconName = isActive ? tab.iconActive : tab.iconInactive;
          const tintColor = isActive ? Colors.primary : Colors.textMuted;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              onPress={() => handleTabPress(tab.route)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <View style={[styles.iconContainer, isActive && styles.iconActiveContainer]}>
                <Ionicons name={iconName} size={22} color={tintColor} />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: tintColor },
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  innerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 50,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActiveContainer: {
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '800',
    color: Colors.primary,
  },
});
