import React from 'react';
import { View, StyleSheet, Text, ImageBackground, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface LoadingSpinnerProps {
  message?: string;
  minDuration?: number; // Minimum time to show loading screen in milliseconds
  onComplete?: () => void; // Callback when minimum duration is met
}

export default function LoadingSpinner({ message = "Loading...", minDuration = 3000, onComplete }: LoadingSpinnerProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const [isVisible, setIsVisible] = React.useState(true);

  // Fade out animation when loading completes
  React.useEffect(() => {
    if (!isVisible) {
      opacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
    }
  }, [isVisible]);

  React.useEffect(() => {
    // Start rotation animation
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1, // Infinite repeat
      false // Don't reverse
    );

    // Start scale and opacity animation
    scale.value = withRepeat(
      withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true // Reverse
    );

    opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });

    // Set minimum display time
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.(); // Call the callback if provided
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Solid Background Layer - Same as other screens */}
      <View style={styles.solidBackground} />
      
      {/* Image Layer - THETA-BG-TRANS.png - Same as other screens */}
      <ImageBackground
        source={require('../assets/images/THETA-BG-TRANS.png')}
        style={styles.imageBackground}
        resizeMode="cover"
      >
        <View style={styles.imageOverlay} />
      </ImageBackground>

      <Animated.View style={[styles.content, { opacity }]}>
        {/* Sleek Custom Spinner */}
        <View style={styles.spinnerContainer}>
          <Animated.View style={[styles.spinner, spinnerStyle]}>
            <LinearGradient
              colors={['#7B4BD6', '#9B6BD6', '#B9A8E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.spinnerGradient}
            />
          </Animated.View>
        </View>
        
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Same background structure as other screens
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  spinnerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  spinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#7B4BD6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  spinnerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  message: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans-Medium',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 