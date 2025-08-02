import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import CustomBottomNavigation from '../../components/CustomBottomNavigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function TabLayout() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple loading delay to ensure smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Preparing your sleep app..." />;
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