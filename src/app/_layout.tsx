import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { AuthProvider } from '../context/AuthContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // Default lock to portrait orientation on app start
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

    // Hide splash screen after initialization
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="verify-email" options={{ headerShown: false }} />
          <Stack.Screen name="verify-success" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="deposit" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="withdraw" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="transactions" options={{ headerShown: false }} />
          <Stack.Screen name="kyc/index" options={{ headerShown: false }} />
          <Stack.Screen name="kyc/camera-front" options={{ headerShown: false }} />
          <Stack.Screen name="kyc/camera-back" options={{ headerShown: false }} />
          <Stack.Screen name="kyc/camera-selfie" options={{ headerShown: false }} />
          <Stack.Screen name="kyc/result" options={{ headerShown: false }} />
          <Stack.Screen name="kyc/nfc" options={{ headerShown: false }} />
          <Stack.Screen name="sims/verify" options={{ headerShown: false }} />
          <Stack.Screen name="sims/register" options={{ headerShown: false }} />
          <Stack.Screen name="contract/[tradeId]" options={{ headerShown: false }} />
          <Stack.Screen name="handover/[tradeId]" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
