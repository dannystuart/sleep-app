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
import { ChevronLeft } from 'lucide-react-native';
import { useApp } from '../contexts/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

import { setStorageItem } from '../lib/storage';
import { Stack } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// --- Shared sizing constants (single source of truth) ---
const CARD_WIDTH = screenWidth * 0.65;          // tweak here only
const CARD_MARGIN_H = screenWidth * 0.015;     // tweak here only (must match style)
const CARD_HEIGHT = screenHeight * 0.35;        // optional: keep card height consistent
const STEP = CARD_WIDTH + CARD_MARGIN_H * 2;   // distance between left edges
const MAX_TILT_DEG = 7; // off-canvas tilt for side cards
const BORDER_WIDTH = 1; // gradient stroke thickness

export default function OnboardingClass() {
  const router = useRouter();
  const { classes } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);



  // Center offset based on shared constants
  const centerOffset = (screenWidth - CARD_WIDTH) / 2 - CARD_MARGIN_H;

  const handleClassSelect = async (classId: string) => {
    console.log('🎯 Class selected:', classId);
    
    try {
      // Save selected class to local storage
      await setStorageItem('classId', classId);
      console.log('✅ Class saved to local storage:', classId);
      
      // Navigate to the onboarding streak screen with slide transition
      router.push('/onboarding-streak');
    } catch (error) {
      console.error('❌ Error saving class selection:', error);
    }
  };



  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      translateX.value = withSpring(-newIndex * STEP + centerOffset, {
        damping: 15,
        stiffness: 100,
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < classes.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      translateX.value = withSpring(-newIndex * STEP + centerOffset, {
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
      } else if (event.translationX < -threshold && currentIndex < classes.length - 1) {
        // Swipe left - go to next
        runOnJS(goToNext)();
      } else {
        // Snap back to current position
        translateX.value = withSpring(-currentIndex * STEP + centerOffset, {
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
    translateX.value = -currentIndex * STEP + centerOffset;
  }, []);





  // Don't render if no classes
  if (classes.length === 0) {
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
          <Text style={styles.loadingText}>Loading classes...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        name="onboarding-class" 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />

      {/* Header with back navigation */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Background */}
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

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Which class would you like your coach to teach first?</Text>
        </View>

        {/* Class Carousel */}
        <View style={styles.carouselContainer}>
          <View style={styles.carouselWrapper}>
            <PanGestureHandler onGestureEvent={gestureHandler}>
              <Animated.View style={[styles.carousel, carouselStyle]}>
                {classes.map((classItem, index) => {
                  // Calculate the position of this card relative to the viewport center
                  const cardLeft = CARD_MARGIN_H + index * STEP; // actual left edge including the first margin

                  return (
                    <Animated.View 
                      key={classItem.id} 
                      style={[
                        styles.shadowWrap,
                        useAnimatedStyle(() => {
                          // Calculate how far this card is from the center
                          const distanceFromCenter = Math.abs(
                            (translateX.value + cardLeft + CARD_WIDTH / 2) - screenWidth / 2
                          );
                          const maxDistance = STEP; // one card away

                          // Determine if this card is left (-) or right (+) of centre
                          const centreX = screenWidth / 2;
                          const cardCentreX = translateX.value + cardLeft + CARD_WIDTH / 2;
                          const sideSign = cardCentreX < centreX ? -1 : 1; // left: -1 (tilt -deg), right: +1 (tilt +deg)

                          // Tilt grows with distance from centre up to MAX_TILT_DEG
                          const tiltMagnitude = interpolate(
                            distanceFromCenter,
                            [0, maxDistance],
                            [0, MAX_TILT_DEG],
                            'clamp'
                          );
                          const rotateZDeg = sideSign * tiltMagnitude;

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
                            transform: [
                              { perspective: 1000 },
                              { rotateZ: `${rotateZDeg}deg` },
                              { scale },
                            ],
                            opacity,
                          };
                        }),
                      ]}
                    >
                      {/* Recommended pill for first card - centered wrapper */}
                      {index === 0 && (
                        <View style={styles.recommendedPillContainer}>
                          <View style={styles.recommendedPill}>
                            <Text style={styles.recommendedText}>Recommended</Text>
                          </View>
                        </View>
                      )}

                      <LinearGradient
                        colors={[ 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.15)' ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientBorder}
                      >
                        <View style={styles.classCard}>
                          {/* Inner shadow overlay */}
                          <LinearGradient
                            colors={['rgba(0,0,0,0.4)', 'transparent']}
                            locations={[0, 0.1]} // shadow fades out by 80% of the height
                            start={{ x: 0.5, y: 1 }}
                            end={{ x: 0.5, y: 0 }}
                            style={styles.innerShadow}
                          />

                          {/* Content for first card only */}
                          {index === 0 && (
                            <View style={styles.firstCardContent}>
                              <Text style={styles.mixedSubjectsTitle}>Mixed Subjects</Text>
                              
                              <View style={styles.subjectsGrid}>
                                <TouchableOpacity style={styles.subjectButton}>
                                  <Text style={styles.subjectButtonText}>Maths</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.subjectButton}>
                                  <Text style={styles.subjectButtonText}>Memory</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.subjectButton}>
                                  <Text style={styles.subjectButtonText}>Word</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.subjectButton}>
                                  <Text style={styles.subjectButtonText}>Facts</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}

                          {/* Content for individual class cards */}
                          {index > 0 && (
                            <View style={styles.classCardContent}>
                              <View style={styles.classIcon}>
                                <Image 
                                  source={
                                    index === 1 ? require('../assets/images/onboarding/maths.png') :
                                    index === 2 ? require('../assets/images/onboarding/memory.png') :
                                    require('../assets/images/onboarding/word.png')
                                  }
                                  style={styles.classIconImage}
                                  resizeMode="contain"
                                />
                              </View>
                              <Text style={styles.className}>{classItem.name}</Text>
                            </View>
                          )}

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

                        

                          {/* Action Buttons - Overlay */}
                          <View style={styles.actionButtonsOverlay}>
                            <TouchableOpacity
                              style={styles.selectButton}
                              onPress={() => handleClassSelect(classItem.id)}
                            >
                              <Text style={styles.selectButtonText}>Select Class</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </LinearGradient>
                    </Animated.View>
                  );
                })}
              </Animated.View>
            </PanGestureHandler>
          </View>

          {/* Navigation Dots */}
          <View style={styles.dotsContainer}>
            {classes.map((_, index) => (
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


      </View>
    </>
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
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 0,
    marginTop: 100,
    zIndex: 1000,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    lineHeight: 32,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 1000,
    marginTop: 80,
  },
  carouselWrapper: {
    width: screenWidth,
    overflow: 'visible',
  },
  carousel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0, // Remove padding to allow proper centering
  },
  classCard: {
    flex: 1,
    borderRadius: 18.705,
    backgroundColor: '#794BD6',
    overflow: 'hidden',
    position: 'relative',
  },
  innerShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18.705,
    zIndex: 2, // sits above bg but below overlays
  },
  classImage: {
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
  
  actionButtonsOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  gradientBorder: {
    flex: 1,
    borderRadius: 18.705,
    padding: BORDER_WIDTH, // stroke thickness
  },
  shadowWrap: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN_H,
    borderRadius: 18.705,
    // Outer shadow (visible because this wrapper does NOT clip)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 20,
    elevation: 16,
  },

  selectButton: {
    backgroundColor: 'rgba(35, 35, 35, 1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
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
    color: 'white',
    fontSize: 18,
    fontWeight: '400',
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 24,
  },
  reassuranceText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 22,
  },
  firstCardContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    zIndex: 10,
  },
  mixedSubjectsTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Medium',
    marginBottom: 24,
  },
  mixedSubjectsSubtitle: {
    fontSize: 32,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-SemiBold',
    marginBottom: 40,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  subjectButton: {
    width: 80,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F69197',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans-Medium',
  },
  classCardContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
    paddingTop: 40,
  },
  classIcon: {
    marginBottom: 10,
    alignItems: 'center',
  },
  classIconImage: {
    width: 100,
    height: 100,
  },
  className: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 30 : 20, // Reduced from 50/40 to 30/20
    left: 20,
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
  recommendedPillContainer: {
    position: 'absolute',
    top: -15,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  recommendedPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  recommendedText: {
    color: 'black',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  
});
