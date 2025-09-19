import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFonts, Dongle_400Regular } from '@expo-google-fonts/dongle';
import { 
  PlusJakartaSans_200ExtraLight,
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { enableScreens } from 'react-native-screens';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider } from '../contexts/AppContext';
import { getStorageItem } from '../lib/storage';

// Re-enable native screens so React Navigation can hide inactive tabs
enableScreens();

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  
  const [fontsLoaded, fontError] = useFonts({
    // Onboarding fonts (Plus Jakarta Sans)
    'PlusJakartaSans-ExtraLight': PlusJakartaSans_200ExtraLight,
    'PlusJakartaSans-Light': PlusJakartaSans_300Light,
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
    
    // Main app font (DM Sans) - single family with weight support
    'DMSans': DMSans_400Regular,
    
    // Legacy fonts
    'Dongle-Regular': Dongle_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();

      // decide onboarding vs home
      (async () => {
        const has = await getStorageItem('hasOnboarded');
        // Only redirect on very first app render; avoid loops by checking path?
        // We are in the root layout before the stack mounts, so replace is fine.
        if (!has || has === '') {
          router.replace('/onboarding');
        }
      })();
    }
    window.frameworkReady?.();
  }, [fontsLoaded, fontError]);

  // Return null to keep splash screen visible while fonts load
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {/* 
            StatusBar with translucent background so content draws under it
          */}
          <StatusBar
            style="light"
            backgroundColor="transparent"
            translucent={true}
          />

          {/* 
            ImageBackground at root, covers full screen including status bar and safe areas
          */}
          <ImageBackground
            source={require('../assets/images/THETA-BG.png')}
            style={styles.background}
            resizeMode="cover"
          >
            {/*
              SafeAreaView with transparent background
              edges ['top','bottom'] means children are padded,
              but the background image still shows under the insets.
            */}
            <SafeAreaView
              style={styles.safeArea}
              edges={['top', 'bottom']}
            >
              <Stack screenOptions={{ 
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                animation: 'none'
              }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'card', animation: 'fade' }} />
                <Stack.Screen name="onboarding-coach" options={{ headerShown: false, presentation: "card", animation: "slide_from_right" }} />
                <Stack.Screen 
                  name="choose-coach" 
                  options={{ 
                    headerShown: false,
                    presentation: 'modal',
                    animation: 'slide_from_bottom'
                  }} 
                />
                                     <Stack.Screen
                         name="choose-class"
                         options={{
                           headerShown: false,
                           presentation: 'modal',
                           animation: 'slide_from_bottom'
                         }}
                       />
                       <Stack.Screen
                         name="sleep-timer"
                         options={{
                           headerShown: false,
                           presentation: 'modal',
                           animation: 'slide_from_bottom'
                         }}
                       />
                       <Stack.Screen
                         name="sleep-session"
                         options={{
                           headerShown: false,
                           presentation: 'card',
                           animation: 'slide_from_right',
                           contentStyle: { backgroundColor: '#000' }
                         }}
                       />
                       <Stack.Screen name="+not-found" />
              </Stack>
            </SafeAreaView>
          </ImageBackground>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    // ensures the image sits behind status bar and home indicator
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
