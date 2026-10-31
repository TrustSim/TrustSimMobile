import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

function TabIconBubble({
  name,
  focused,
}: {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <MaterialCommunityIcons
        name={name}
        size={22}
        color={focused ? '#FFFFFF' : Colors.textMuted}
      />
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const bottomOffset = Math.max(insets.bottom, 12) + 6;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          bottom: bottomOffset,
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
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          height: 64,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ focused }) => (
            <TabIconBubble
              name={focused ? 'home' : 'home-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sims"
        options={{
          title: 'Xác thực SIM',
          tabBarIcon: ({ focused }) => (
            <TabIconBubble
              name={focused ? 'sim' : 'sim-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: 'Hợp đồng bảo chứng',
          tabBarIcon: ({ focused }) => (
            <TabIconBubble
              name={focused ? 'file-document' : 'file-document-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Ví tiền',
          tabBarIcon: ({ focused }) => (
            <TabIconBubble
              name={focused ? 'wallet' : 'wallet-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Định danh',
          tabBarIcon: ({ focused }) => (
            <TabIconBubble
              name={focused ? 'account' : 'account-outline'}
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
