import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
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
    iconActive: 'home',
    iconInactive: 'home-outline',
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
    iconActive: 'file-document',
    iconInactive: 'file-document-outline',
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
    iconActive: 'account',
    iconInactive: 'account-outline',
  },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab = 'none',
  style,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12) + 6;

  const handleTabPress = (route: string) => {
    router.replace(route as any);
  };

  return (
    <View
      style={[
        styles.floatingContainer,
        {
          bottom: bottomOffset,
        },
        style,
      ]}
    >
      <View style={styles.innerRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const iconName = isActive ? tab.iconActive : tab.iconInactive;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              onPress={() => handleTabPress(tab.route)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.iconPill, isActive && styles.iconPillActive]}>
                <MaterialCommunityIcons
                  name={iconName}
                  size={22}
                  color={isActive ? '#FFFFFF' : Colors.textMuted}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.08)',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    justifyContent: 'center',
    zIndex: 99,
  },
  innerRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: Colors.navy,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});
