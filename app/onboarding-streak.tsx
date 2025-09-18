import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function OnboardingStreak() {
  const router = useRouter();

  const handleContinue = () => {
    // Navigate to the notifications onboarding screen
    router.push('/onboarding-notifications');
  };

  const handleBack = () => {
    console.log('🔙 Back button pressed');
    // Go back to the previous screen in the navigation stack
    router.back();
  };

  return (
    <>
      <Stack.Screen 
        name="onboarding-streak" 
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

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Streak Image */}
          <View style={styles.imageContainer}>
            <ImageBackground
              source={require('../assets/images/onboarding/onboarding-streak.png')}
              style={styles.streakImage}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Visit Thetaverse each night to grow your streak</Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              Consistency is key to great sleep.
            </Text>
            <Text style={styles.description}>
            Keep going to unlock surprise&nbsp;rewards...
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
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 1000,
  },
  imageContainer: {
    marginBottom: 60,
    alignItems: 'center',
  },
  streakImage: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.2,
  },
  titleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    lineHeight: 36,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  descriptionContainer: {
    marginBottom: 60,
    alignItems: 'center',
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: 'PlusJakartaSans-Regular',
    marginBottom: 20,
  },

  continueButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
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
});
