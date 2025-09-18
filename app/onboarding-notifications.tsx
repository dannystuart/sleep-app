import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, Platform, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function OnboardingNotifications() {
  const router = useRouter();
  
  // Animation values for moon
  const moonY = useSharedValue(screenHeight * 0.6); // Start below gradient
  const moonOpacity = useSharedValue(0);

  const handleContinue = () => {
    // Navigate to the onboarding completion screen
    router.push('/onboarding-complete');
  };

  const handleBack = () => {
    console.log('🔙 Back button pressed');
    // Go back to the previous screen in the navigation stack
    router.back();
  };

  // Start moon animation after 1 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      moonOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
      moonY.value = withTiming(screenHeight * 0.3, { duration: 1000, easing: Easing.out(Easing.quad) });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Animated style for moon
  const moonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: moonY.value }],
    opacity: moonOpacity.value,
  }));

  return (
    <>
      <Stack.Screen 
        name="onboarding-notifications" 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />

      {/* Header with back navigation */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
        >
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Background */}
      <View style={styles.container}>
        {/* Solid Background Layer - Same as other onboarding screens */}
        <View style={styles.solidBackground} />
        
        {/* Image Layer - THETA-BG-TRANS.png - Same as other onboarding screens */}
        <ImageBackground
          source={require('../assets/images/THETA-BG-TRANS.png')}
          style={styles.imageBackground}
          resizeMode="cover"
        >
          <View style={styles.imageOverlay} />
        </ImageBackground>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>We like to check in on you each morning to find out how you slept!</Text>
        </View>

        {/* Gradient Container (Background) */}
        <View style={styles.gradcontainer}>
          <ImageBackground
            source={require('../assets/images/onboarding/onboarding-gradient.png')}
            style={styles.gradientImage}
            resizeMode="stretch"
            onError={(error) => console.log('❌ Image loading error:', error)}
            onLoad={() => console.log('✅ Image loaded successfully')}
          />
        </View>

        {/* Bottom Container (Transparent, for content) */}
        <View style={styles.bottomContainer}>
          {/* Notification Text */}
          <View style={styles.notificationTextContainer}>
            <Text style={styles.notificationText}>
              Allow notifications to get the check-ins.
            </Text>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7B4BD6', '#9B6BD6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Moon Image - Animated */}
        <Animated.View style={[styles.moonContainer, moonAnimatedStyle]}>
          <Image
            source={require('../assets/images/onboarding/onboarding-moon.png')}
            style={styles.moonImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Same background structure as other onboarding screens
  solidBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#15131A',
  },
  imageBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageOverlay: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    zIndex: 2000,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2001,
  },
  titleContainer: {
    position: 'absolute',
    top: '15%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 1000,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    lineHeight: 30,
    fontFamily: 'PlusJakartaSans-Medium',
  },

  gradcontainer: {
    zIndex: 999,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 'auto', // Let the image determine the height
    justifyContent: 'flex-end',
  },

  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.4, // 40% of screen height
    zIndex: 1000,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  gradientImage: {
    width: screenWidth,
    height: 400, // Give it a specific height to ensure visibility
    resizeMode: 'stretch',
  },
  notificationTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  notificationText: {
    fontSize: 20,
    color: 'white',
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  continueButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    paddingHorizontal: 20,
  },
  gradientButton: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-SemiBold',
    textAlign: 'center',
  },
  moonContainer: {
    position: 'absolute',
    bottom: screenHeight * 0.72, // Start position below gradient
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 998, // Below the gradient but above background
  },
  moonImage: {
    width: screenWidth * 0.6, // 40% of screen width
    height: screenWidth * 0.6, // Square aspect ratio
  },
});
