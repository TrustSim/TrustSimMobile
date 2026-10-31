import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

function TabIconBubble({
  name,
  color,
  focused,
}: {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <MaterialCommunityIcons name={name} size={21} color={focused ? Colors.navy : color} />
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const bottomInset = Math.max(insets.bottom, 10);
  const tabHeight = 64 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
          ...Shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: -0.1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color, focused }) => (
            <TabIconBubble
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              color={color as string}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sims"
        options={{
          title: 'Xác thực SIM',
          tabBarIcon: ({ color, focused }) => (
            <TabIconBubble
              name={focused ? 'sim' : 'sim-outline'}
              color={color as string}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: 'Bằng chứng',
          tabBarIcon: ({ color, focused }) => (
            <TabIconBubble
              name="camera-document"
              color={color as string}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Ví tiền',
          tabBarIcon: ({ color, focused }) => (
            <TabIconBubble
              name={focused ? 'wallet' : 'wallet-outline'}
              color={color as string}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Định danh',
          tabBarIcon: ({ color, focused }) => (
            <TabIconBubble
              name={focused ? 'shield-account' : 'shield-account-outline'}
              color={color as string}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="auctions"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
});
