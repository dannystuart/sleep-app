import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import CustomBottomNavigation from '../../components/CustomBottomNavigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';

export default function TabLayout() {
  const [isUILoading, setIsUILoading] = useState(true);
  const { isLoading: isDataLoading } = useApp();

  const handleLoadingComplete = () => {
    setIsUILoading(false);
  };

  // Only show the app when both UI loading is complete AND data is ready
  const shouldShowApp = !isUILoading && !isDataLoading;

  useEffect(() => {
    // Let the LoadingSpinner control the duration
    // The LoadingSpinner will call handleLoadingComplete when ready
  }, []);

  if (!shouldShowApp) {
    return <LoadingSpinner 
      message="Preparing your sleep app..." 
      minDuration={2000} // Reduced minimum duration since we're waiting for real data
      onComplete={handleLoadingComplete}
    />;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Tabs 
          screenOptions={{ 
            headerShown: false, 
            tabBarStyle: { display: 'none' },
            sceneStyle: { backgroundColor: 'transparent' }, // Transparent scene style
            lazy: false, // Preload all screens
            animation: 'none', // Disable default animations
          }}
        >
          <Tabs.Screen
            name="index"
            options={{ title: 'Play' }}
          />
          <Tabs.Screen
            name="diary"
            options={{ title: 'Diary' }}
          />
          <Tabs.Screen
            name="settings"
            options={{ title: 'Settings' }}
          />
        </Tabs>
        <CustomBottomNavigation />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent to let root background show through
  },
});