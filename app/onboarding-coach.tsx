import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, ImageBackground, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
  interpolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Play, ChevronLeft } from 'lucide-react-native';
import { useApp } from '../contexts/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function OnboardingCoach() {
  const router = useRouter();
  const { coaches } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  
  // Updated card dimensions for better visibility
  const cardWidth = screenWidth * 0.7; // Reduced from 0.8 to show edges
  const cardSpacing = screenWidth * 0.05; // Reduced spacing
  const centerOffset = (screenWidth - cardWidth) / 2; // Center the main card

  const handleCoachSelect = (coachId: string) => {
    console.log('🎯 Coach selected:', coachId);
    // Navigate to next screen or save selection
    router.replace('/');
  };

  const handlePreviewVoice = (coachId: string) => {
    console.log('🎵 Previewing voice for coach:', coachId);
    // Add voice preview logic here
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      translateX.value = withSpring(-newIndex * (cardWidth + cardSpacing) + centerOffset, {
        damping: 15,
        stiffness: 100,
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < coaches.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      translateX.value = withSpring(-newIndex * (cardWidth + cardSpacing) + centerOffset, {
        damping: 15,
        stiffness: 100,
      });
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
    },
    onActive: (event, context: any) => {
      translateX.value = context.startX + event.translationX;
    },
    onEnd: (event) => {
      const threshold = 50;
      if (event.translationX > threshold && currentIndex > 0) {
        // Swipe right - go to previous
        runOnJS(goToPrevious)();
      } else if (event.translationX < -threshold && currentIndex < coaches.length - 1) {
        // Swipe left - go to next
        runOnJS(goToNext)();
      } else {
        // Snap back to current position
        translateX.value = withSpring(-currentIndex * (cardWidth + cardSpacing) + centerOffset, {
          damping: 15,
          stiffness: 100,
        });
      }
    },
  });

  const carouselStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Initialize position to center the first card
  React.useEffect(() => {
    translateX.value = centerOffset;
  }, []);

  // Don't render if no coaches
  if (coaches.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.solidBackground} />
        <ImageBackground
          source={require('../assets/images/THETA-BG-TRANS.png')}
          style={styles.imageBackground}
          resizeMode="cover"
        >
          <View style={styles.imageOverlay} />
        </ImageBackground>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading coaches...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Solid Background Layer - Same as onboarding */}
      <View style={styles.solidBackground} />
      
      {/* Image Layer - THETA-BG-TRANS.png - Same as onboarding */}
      <ImageBackground
        source={require('../assets/images/THETA-BG-TRANS.png')}
        style={styles.imageBackground}
        resizeMode="cover"
      >
        <View style={styles.imageOverlay} />
      </ImageBackground>

      {/* Header 
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>
      </View>*/}

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>It's important to get started with your perfect sleep coach.</Text>
      </View>

      {/* Coach Carousel */}
      <View style={styles.carouselContainer}>
        <View style={styles.carouselWrapper}>
          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[styles.carousel, carouselStyle]}>
              {coaches.map((coach, index) => {
                // Calculate the position of this card relative to the viewport center
                const cardPosition = index * (cardWidth + cardSpacing);
                
                return (
                  <Animated.View 
                    key={coach.id} 
                    style={[
                      styles.coachCard,
                      useAnimatedStyle(() => {
                        // Calculate how far this card is from the center
                        const distanceFromCenter = Math.abs(translateX.value + cardPosition - centerOffset);
                        const maxDistance = cardWidth + cardSpacing;
                        
                        // Scale based on distance from center (20% smaller when not centered)
                        const scale = interpolate(
                          distanceFromCenter,
                          [0, maxDistance],
                          [1, 0.8],
                          'clamp'
                        );
                        
                        // Opacity based on distance from center
                        const opacity = interpolate(
                          distanceFromCenter,
                          [0, maxDistance],
                          [1, 0.6],
                          'clamp'
                        );
                        
                        return {
                          transform: [{ scale }],
                          opacity,
                        };
                      })
                    ]}
                  >
                    {/* Base image (unblurred, full card) */}
                    <Image
                      source={{ uri: coach.image_url }}
                      style={styles.coachImage}
                      defaultSource={require('../assets/images/brain-icon.png')}
                    />

                    {/* Progressive bottom-only blur overlay */}
                    <MaskedView
                      style={styles.progressiveBlurOverlay}
                      maskElement={
                        <LinearGradient
                          // Transparent at the top → opaque at the bottom (controls where blur shows)
                          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)']}
                          // Adjust where the blur starts: 0.45 means ~45% from top
                          locations={[0.4, 1]}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                          style={styles.maskFill}
                        />
                      }
                    >
                      <Image
                        source={{ uri: coach.image_url }}
                        style={styles.coachImage}
                        defaultSource={require('../assets/images/brain-icon.png')}
                        blurRadius={Platform.select({ ios: 5, android: 5 })}
                      />
                    </MaskedView>
                    
                    {/* Gradient Overlay */}
                    <LinearGradient
                      colors={[
                        'rgba(0,0,0,0)',
                        '#F69197'
                      ]}
                      locations={[0.1169, 0.9262]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.imageGradientOverlay}
                    />

                    {/* Name Tag - Overlay */}
                    <View style={styles.nameTagOverlay}>
                      <Text style={styles.nameTagText}>{coach.name}</Text>
                    </View>

                    {/* Action Buttons - Overlay */}
                    <View style={styles.actionButtonsOverlay}>
                      <TouchableOpacity
                        style={styles.previewButton}
                        onPress={() => handlePreviewVoice(coach.id)}
                      >
                        <Play size={20} color="white" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.selectButton}
                        onPress={() => handleCoachSelect(coach.id)}
                      >
                        <Text style={styles.selectButtonText}>Select Coach</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                );
              })}
            </Animated.View>
          </PanGestureHandler>
        </View>

        {/* Navigation Dots */}
        <View style={styles.dotsContainer}>
          {coaches.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot
              ]}
            />
          ))}
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionText}>Their voice will guide  you to Thetaverse.</Text>
        <Text style={styles.reassuranceText}>Don't worry you can change coach later</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Same background structure as onboarding
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
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1000,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 40,
    marginTop: 40,
    zIndex: 1000,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: 'white',
    textAlign: 'center',
    lineHeight: 30,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  carouselWrapper: {
    width: screenWidth,
    overflow: 'hidden',
  },
  carousel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0, // Remove padding to allow proper centering
  },
  coachCard: {
    width: screenWidth * 0.7, // Reduced width to show edges
    height: screenHeight * 0.5,
    borderRadius: 18.705,
    borderWidth: 0.779,
    borderColor: '#FFF',
    backgroundColor: '#794BD6',
    marginHorizontal: screenWidth * 0.025, // Reduced margin
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  nameTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  nameTagText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  nameTagSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    borderRadius: 18.705,
    borderWidth: 0.779,
    borderColor: '#FFF',
    backgroundColor: '#794BD6',
    overflow: 'hidden',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.5,
    shadowRadius: 31.175,
    elevation: 10,
    position: 'relative',
  },
  coachImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // Fills the card, sits above the base image
  progressiveBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // Just a helper to fill the mask element
  maskFill: {
    ...StyleSheet.absoluteFillObject,
  },
  imageGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  nameTagOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  actionButtonsOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },

  coachCardWrapper: {
    width: screenWidth * 0.7,
    height: screenHeight * 0.5,
    marginHorizontal: screenWidth * 0.025,
    position: 'relative',
  },
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18.705,
    padding: 2, // This creates the border width
  },
  previewButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButton: {
    backgroundColor: 'rgba(35, 35, 35, 1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  instructionsContainer: {
    paddingHorizontal: 40,
    paddingBottom: 60,
    alignItems: 'flex-start',
    zIndex: 1000,
  },
  instructionText: {
    fontSize: 18,
    color: 'white',
    marginBottom: 4,
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 24,
    textAlign: 'center',

  },
  reassuranceText: {
    fontSize: 16,
    color: '#F6EE9A', // Yellow-green color
    marginTop: 16,
    marginBottom: 4,
    fontFamily: 'PlusJakartaSans-Medium',
    lineHeight: 24,
    textAlign: 'center',  
  },
});
