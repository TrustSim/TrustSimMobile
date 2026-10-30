import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const bottomInset = Math.max(insets.bottom, 8);
  const tabHeight = 56 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.blue,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang Chủ',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" size={size ?? 22} color={color as string} />
          ),
          tabBarActiveTintColor: Colors.blue,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Ví Tiền',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wallet-outline" size={size ?? 22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: 'Hợp Đồng',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document-outline" size={size ?? 22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Hồ Sơ',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" size={size ?? 22} color={color as string} />
          ),
        }}
      />
      {/* Ẩn mục Đấu giá khỏi thanh điều hướng dưới */}
      <Tabs.Screen
        name="auctions"
        options={{ href: null }}
      />
      {/* Ẩn mục SIMs cũ khỏi thanh điều hướng dưới */}
      <Tabs.Screen
        name="sims"
        options={{ href: null }}
      />
    </Tabs>
  );
}
