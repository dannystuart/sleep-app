import { Tabs } from 'expo-router';
import { View, StyleSheet, Animated, Easing, InteractionManager } from 'react-native';
import CustomBottomNavigation from '../../components/CustomBottomNavigation';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';
import { startAnalyticsSession } from '../../lib/analytics';

export default function TabLayout() {
  const { isLoading: isDataLoading } = useApp();

  const [overlayVisible, setOverlayVisible] = useState(true);
  const overlayOpacity = useState(new Animated.Value(1))[0];
  const hasShownOnce = useState({ current: false })[0];

  // Crossfade overlay gate: show only on cold start and while data is loading/settling
  useEffect(() => {
    // On first mount, keep overlay visible; once data is ready and any interactions settle, fade it out
    if (!isDataLoading) {
      InteractionManager.runAfterInteractions(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
        
        // Move state updates outside of animation callback to avoid useInsertionEffect error
        setTimeout(() => {
          setOverlayVisible(false);
          hasShownOnce.current = true;
          startAnalyticsSession('cold');
        }, 280); // Match animation duration
      });
    } else {
      // If data is loading again (e.g., very first cold start), ensure overlay is shown
      if (!hasShownOnce.current) {
        setOverlayVisible(true);
        overlayOpacity.setValue(1);
      }
    }
  }, [isDataLoading]);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Tabs 
          screenOptions={{ 
            headerShown: false, 
            tabBarStyle: { display: 'none' },
            sceneStyle: { backgroundColor: 'transparent' },
            lazy: false,
            animation: 'none',
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Play' }} />
          <Tabs.Screen name="diary" options={{ title: 'Diary' }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        </Tabs>
        <CustomBottomNavigation />

        {overlayVisible && (
          <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    backgroundColor: '#0A0A0D',
  },
});