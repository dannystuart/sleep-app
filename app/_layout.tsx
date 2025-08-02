import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFonts, Dongle_400Regular } from '@expo-google-fonts/dongle';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { enableScreens } from 'react-native-screens';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

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
  
  const [fontsLoaded, fontError] = useFonts({
    'Dongle-Regular': Dongle_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
    window.frameworkReady?.();
  }, [fontsLoaded, fontError]);

  // Return null to keep splash screen visible while fonts load
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
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
                         animation: 'slide_from_right'
                       }}
                     />
                     <Stack.Screen name="+not-found" />
            </Stack>
          </SafeAreaView>
        </ImageBackground>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
