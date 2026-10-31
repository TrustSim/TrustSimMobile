import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows } from '../constants/theme';

export type NavTabId = 'home' | 'sims' | 'contracts' | 'wallet' | 'account' | 'none';

interface BottomNavBarProps {
  activeTab?: NavTabId;
  style?: ViewStyle;
}

interface TabConfig {
  id: NavTabId;
  label: string;
  route: string;
  iconActive: keyof typeof MaterialCommunityIcons.glyphMap;
  iconInactive: keyof typeof MaterialCommunityIcons.glyphMap;
}

const TABS: TabConfig[] = [
  {
    id: 'home',
    label: 'Tổng quan',
    route: '/(tabs)',
    iconActive: 'view-dashboard',
    iconInactive: 'view-dashboard-outline',
  },
  {
    id: 'sims',
    label: 'Xác thực SIM',
    route: '/(tabs)/sims',
    iconActive: 'sim',
    iconInactive: 'sim-outline',
  },
  {
    id: 'contracts',
    label: 'Bằng chứng',
    route: '/(tabs)/contracts',
    iconActive: 'camera-document',
    iconInactive: 'camera-document',
  },
  {
    id: 'wallet',
    label: 'Ví tiền',
    route: '/(tabs)/wallet',
    iconActive: 'wallet',
    iconInactive: 'wallet-outline',
  },
  {
    id: 'account',
    label: 'Định danh',
    route: '/(tabs)/account',
    iconActive: 'shield-account',
    iconInactive: 'shield-account-outline',
  },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab = 'none',
  style,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const tabHeight = 64 + bottomInset;

  const handleTabPress = (route: string) => {
    router.replace(route as any);
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: tabHeight,
          paddingBottom: bottomInset,
        },
        style,
      ]}
    >
      <View style={styles.innerRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const iconName = isActive ? tab.iconActive : tab.iconInactive;
          const tintColor = isActive ? Colors.navy : Colors.textMuted;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              onPress={() => handleTabPress(tab.route)}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.iconPill, isActive && styles.iconPillActive]}>
                <MaterialCommunityIcons name={iconName} size={21} color={tintColor} />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: tintColor, fontWeight: isActive ? '800' : '600' },
                ]}
                numberOfLines={1}
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
    paddingTop: 6,
    ...Shadows.md,
  },
  innerRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconPill: {
    width: 44,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: '#E8EFFD',
  },
  tabLabel: {
    fontSize: 10.5,
    letterSpacing: -0.1,
  },
});
