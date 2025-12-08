import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { ScreenBackground } from '../components/ScreenBackground';
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
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';
import { stopSleepSession } from '../lib/audio/player';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// --- Shared sizing constants (single source of truth) ---
const CARD_WIDTH = screenWidth * 0.65;          // tweak here only
const CARD_MARGIN_H = screenWidth * 0.015;     // tweak here only (must match style)
const CARD_HEIGHT = screenHeight * 0.4;        // optional: keep card height consistent
const STEP = CARD_WIDTH + CARD_MARGIN_H * 2;   // distance between left edges
const MAX_TILT_DEG = 7; // off-canvas tilt for side cards
const BORDER_WIDTH = 1; // gradient stroke thickness

// Separate component for each coach card to properly isolate hooks
const CoachCard = ({ 
  coach, 
  index, 
  translateX, 
  playingIndex, 
  lottieOpacity, 
  playButtonOpacity, 
  onPreviewVoice, 
  onSelectCoach 
}: {
  coach: any;
  index: number;
  translateX: any;
  playingIndex: number | null;
  lottieOpacity: any;
  playButtonOpacity: any;
  onPreviewVoice: (index: number, coach: any) => void;
  onSelectCoach: (coachId: string) => void;
}) => {
  // Calculate the position of this card relative to the viewport center
  const cardLeft = CARD_MARGIN_H + index * STEP; // actual left edge including the first margin

  // Create animated style for this specific card
  const cardAnimatedStyle = useAnimatedStyle(() => {
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
  });

  return (
    <Animated.View 
      key={coach.id} 
      style={[
        styles.shadowWrap,
        cardAnimatedStyle,
      ]}
    >
      <LinearGradient
        colors={[ 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.15)' ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={styles.coachCard}>
          {/* Inner shadow overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent']}
            locations={[0, 0.1]} // shadow fades out by 80% of the height
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={styles.innerShadow}
          />

          {/* Base image (unblurred, full card) */}
          <Image
            source={{ uri: coach.image_url }}
            style={styles.coachImage}
            defaultSource={require('../assets/images/brain-icon.png')}
            contentFit="cover"
            transition={0}
            cachePolicy="disk"
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
             contentFit="cover"
             transition={0}
             cachePolicy="disk"
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
             onPress={() => onPreviewVoice(index, coach)}
             activeOpacity={0.8}
           >
             {playingIndex === index ? (
               <Animated.View style={{ opacity: lottieOpacity }}>
                 <LottieView
                   source={require('../assets/lottie/sound-wave.json')} // place your JSON here
                   autoPlay
                   loop
                   style={styles.previewLottie}
                   speed={1.5}
                 />
               </Animated.View>
             ) : (
               <Animated.View style={{ opacity: playButtonOpacity }}>
                 <Play size={20} color="black" />
               </Animated.View>
             )}
           </TouchableOpacity>

           <TouchableOpacity
             style={styles.selectButton}
             onPress={() => onSelectCoach(coach.id)}
           >
             <Text style={styles.selectButtonText}>Select Coach</Text>
           </TouchableOpacity>
         </View>
       </View>
     </LinearGradient>
   </Animated.View>
  );
};

export default function OnboardingCoach() {
  const router = useRouter();
  const { coaches, streak, setCoach } = useApp() as any;

  const [bestStreak, setBestStreak] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await streak?.getState?.();
        if (alive) setBestStreak(s?.best ?? 0);
      } catch (e) {
        console.warn('Failed to load best streak for onboarding:', e);
        if (alive) setBestStreak(0);
      }
    })();
    return () => { alive = false; };
  }, [streak]);

  const unlockedCoaches = useMemo(
    () => (coaches ?? []).filter((c: any) => (c.unlock_streak ?? 0) <= bestStreak),
    [coaches, bestStreak]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [currentAudioUri, setCurrentAudioUri] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const lottieOpacity = useSharedValue(0);
  const playButtonOpacity = useSharedValue(1);

  // Center offset based on shared constants
  const centerOffset = (screenWidth - CARD_WIDTH) / 2 - CARD_MARGIN_H;

  useEffect(() => {
    if (unlockedCoaches.length === 0) {
      setCurrentIndex(0);
      translateX.value = withSpring(centerOffset, { damping: 15, stiffness: 100 });
      return;
    }
    if (currentIndex > unlockedCoaches.length - 1) {
      const newIndex = Math.max(0, unlockedCoaches.length - 1);
      setCurrentIndex(newIndex);
      translateX.value = withSpring(-newIndex * STEP + centerOffset, { damping: 15, stiffness: 100 });
    }
  }, [unlockedCoaches.length, currentIndex, centerOffset, translateX]);

  const handleCoachSelect = async (coachId: string) => {
    console.log('🎯 Coach selected:', coachId);
    
    try {
      // Save selected coach using AppContext (which also saves to storage)
      await setCoach(coachId);
      console.log('✅ Coach saved via AppContext:', coachId);
      
      // Navigate to onboarding-class screen with slide transition
      router.push('/onboarding-class');
    } catch (error) {
      console.error('❌ Error saving coach selection:', error);
    }
  };

  const fadeOutAndStop = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(0);
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {
      console.log('Error stopping audio:', e);
    } finally {
      setCurrentAudioUri(null);
      setPlayingIndex(null);
    }
  };

  const stopPlayback = async () => {
    // Fade out Lottie animation
    lottieOpacity.value = withTiming(0, { duration: 200 });
    
    await fadeOutAndStop();
    setPlayingIndex(null);
    
    // Fade in play button after Lottie fades out
    setTimeout(() => {
      playButtonOpacity.value = withTiming(1, { duration: 200 });
    }, 200);
  };

  const handlePreviewVoice = async (index: number, coach: any) => {
    console.log('🎵 Play button pressed for coach:', coach.name, 'index:', index);
    
    try {
      // toggle off if tapping the same card
      if (playingIndex === index) {
        console.log('🎵 Stopping current playback (same card)');
        await stopPlayback();
        return;
      }

      // stop any existing
      if (playingIndex !== null) {
        console.log('🎵 Stopping previous playback');
        await stopPlayback();
      }

      // get audio URL from coach (Supabase field)
      const uri = coach.sample_audio || coach.audio_url || coach.preview_url || coach.sample_url;
      console.log('🎵 Audio URI found:', uri);
      
      // Set playing state immediately for instant visual feedback
      setPlayingIndex(index);
      // Fade out play button and fade in Lottie animation
      playButtonOpacity.value = withTiming(0, { duration: 200 });
      lottieOpacity.value = withTiming(1, { duration: 200 });
      
      if (!uri) {
        console.warn('❌ No audio URL found on coach. Using test fallback.');
        const testUri = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        await playSound(testUri);
        return;
      }

      // Try to clean the URI if needed or use it directly
      console.log('🎵 Loading audio from:', uri);
      await playSound(uri);

    } catch (e) {
      console.error('❌ Preview error:', e);
      await stopPlayback();
    }
  };

  // Check if a URL is accessible
  const checkUrlAccessible = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  const playSound = async (uri: string, isRetry = false) => {
    try {
      // Stop any active sleep session before playing sample
      await stopSleepSession();
      
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      
      // Ensure we are not in silent mode and audio is active
      // Use DoNotMix to interrupt other audio (like TrackPlayer)
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        interruptionModeIOS: 1, // DoNotMix - interrupts other audio
        interruptionModeAndroid: 1, // DoNotMix
      });

      console.log('🎵 Attempting to play:', uri);
      
      // Check if URL is accessible first
      const isAccessible = await checkUrlAccessible(uri);
      if (!isAccessible) {
        console.warn('🎵 URL not accessible, will try fallback:', uri);
        throw new Error('URL not accessible');
      }
      
      const { sound, status } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      // Check if loaded successfully
      if (!status.isLoaded) {
        throw new Error('Sound failed to load');
      }
      
      soundRef.current = sound;
      setCurrentAudioUri(uri);
      
      console.log('🎵 Audio playing successfully!');
      
      // Listen for playback to finish naturally instead of timeout
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          fadeOutAndStop();
          lottieOpacity.value = withTiming(0, { duration: 200 });
          setTimeout(() => {
            playButtonOpacity.value = withTiming(1, { duration: 200 });
          }, 200);
          setPlayingIndex(null);
        }
      });
      
    } catch (error) {
      // Only log as warning if we have fallbacks to try (not a fatal error)
      if (!isRetry) {
        console.warn('🎵 Primary URL issue, trying fallbacks...');
      }
      
      // List of fallback URLs to try (public domain / reliable CDNs)
      const fallbackUrls = [
        'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3',
        'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
        'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg',
      ];
      
      if (!isRetry) {
        for (const fallbackUrl of fallbackUrls) {
          try {
            console.log('🎵 Trying fallback:', fallbackUrl);
            await playSound(fallbackUrl, true);
            return; // Success, exit without error
          } catch {
            continue; // Try next fallback
          }
        }
        // All fallbacks failed - now show error
        console.error('🎵 All audio sources failed');
        stopPlayback();
      } else {
        throw error; // Re-throw for fallback loop
      }
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      if (playingIndex !== null && playingIndex !== newIndex) {
        stopPlayback();
      }
      setCurrentIndex(newIndex);
      translateX.value = withSpring(-newIndex * STEP + centerOffset, {
        damping: 15,
        stiffness: 100,
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < unlockedCoaches.length - 1) {
      const newIndex = currentIndex + 1;
      if (playingIndex !== null && playingIndex !== newIndex) {
        stopPlayback();
      }
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
      } else if (event.translationX < -threshold && currentIndex < unlockedCoaches.length - 1) {
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
  useEffect(() => {
    translateX.value = -currentIndex * STEP + centerOffset;
  }, [unlockedCoaches.length]);

  // Set audio mode for iOS silent mode playback
  React.useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(err => console.warn('Failed to set audio mode:', err));
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Don't render if nothing to show (either still loading, or none unlocked)
  if (coaches.length === 0 || unlockedCoaches.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.solidBackground} />
        <ScreenBackground source={require('../assets/images/THETA-BG-TRANS.png')} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>
            {coaches.length === 0
              ? 'Loading coaches...'
              : 'Build your streak to unlock your first coach'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Solid Background Layer - Same as onboarding */}
      <View style={styles.solidBackground} />
      
      {/* Cached + manual fade BG */}
      <ScreenBackground source={require('../assets/images/THETA-BG-TRANS.png')} />

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
        <Text style={styles.title}>It's important to get started with your perfect sleep coach</Text>
      </View>

      {/* Coach Carousel */}
      <View style={styles.carouselContainer}>
        <View style={styles.carouselWrapper}>
          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[styles.carousel, carouselStyle]}>
              {unlockedCoaches.map((coach: any, index: number) => (
                <CoachCard
                  key={coach.id}
                  coach={coach}
                  index={index}
                  translateX={translateX}
                  playingIndex={playingIndex}
                  lottieOpacity={lottieOpacity}
                  playButtonOpacity={playButtonOpacity}
                  onPreviewVoice={handlePreviewVoice}
                  onSelectCoach={handleCoachSelect}
                />
              ))}
            </Animated.View>
          </PanGestureHandler>
        </View>

        {/* Navigation Dots */}
        <View style={styles.dotsContainer}>
          {unlockedCoaches.map((_: any, index: number) => (
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
        <Text style={styles.instructionText}>Their voice will guide you to Theta</Text>
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
    marginBottom: 0,
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
    overflow: 'visible',
  },
  carousel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0, // Remove padding to allow proper centering
  },
  coachCard: {
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
  nameTag: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  nameTagText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-Medium',
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
    top: 0,
    width: '60%',
    backgroundColor: 'rgba(58, 45, 82, 1)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    alignItems: 'center',
    zIndex: 10,
    alignSelf: 'center',
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
  previewButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLottie: {
    width: 56,
    height: 56,
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
    alignItems: 'center',
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