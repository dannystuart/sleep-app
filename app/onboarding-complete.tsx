import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function OnboardingComplete() {
  const router = useRouter();

  const handlePlaySession = () => {
    // Navigate to the main sleep session screen
    router.push('/');
  };

  const handleBack = () => {
    console.log('🔙 Back button pressed');
    // Go back to the previous screen in the navigation stack
    router.back();
  };

  return (
    <>
      <Stack.Screen 
        name="onboarding-complete" 
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
          {/* Welcome Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.mainMessage}>You're all set.</Text>
            <Text style={styles.welcomeText}>Welcome to the Thetaverse.</Text>
          </View>

          {/* Play Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlaySession}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7B4BD6', '#9B6BD6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                <Text style={styles.playButtonText}>Play your sleep session</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  messageContainer: {
    marginBottom: 80,
    alignItems: 'center',
  },
  mainMessage: {
    fontSize: 32,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    lineHeight: 40,
    fontFamily: 'PlusJakartaSans-Medium',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
    lineHeight: 32,
    fontFamily: 'PlusJakartaSans-Regular',
    marginBottom: 8,
  },
  thetaverseText: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
    lineHeight: 32,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  playButton: {
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
  playButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-SemiBold',
    textAlign: 'center',
  },
});
