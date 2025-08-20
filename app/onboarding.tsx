import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { getStorageItem, setStorageItem } from '../lib/storage';

// ---------- tweakable constants ----------
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DUR = {
  fade: 600,
  slide: 600,
  fastslide: 200,
  hold1: 2000,  // after "Hey there…" appears
  hold2: 2500, // after the 2nd line settles
  hold4: 1000,
   // how long to show the 3rd line before leaving
};

const POS = {
  pushUp: -80,     // how much "Hey there…" is nudged up
  fromBottom: 100,  // how far the second/third lines slide in from
};

const FONTS = {
  heyThere: { fontSize: 24, lineHeight: 30, fontFamily: 'PlusJakartaSans-Medium' as const },
  big:      { fontSize: 32, lineHeight: 38, fontFamily: 'PlusJakartaSans-Medium' as const },
  body:     { fontSize: 24, lineHeight: 32, fontFamily: 'PlusJakartaSans-Medium' as const },
};
// ----------------------------------------

export default function Onboarding() {
  const router = useRouter();
  const videoRef = React.useRef<Video>(null);
  const video2Ref = React.useRef<Video>(null);
  const [tapImageReady, setTapImageReady] = React.useState(false);
  const [calmBrainAnimationCompleted, setCalmBrainAnimationCompleted] = React.useState(false);
  const [videoTransitionStarted, setVideoTransitionStarted] = React.useState(false);
  const [finalCtaReady, setFinalCtaReady] = React.useState(false);

  console.log('🎬 Onboarding screen mounted');

  // Handle tap on the tap image
  const handleTapImage = () => {
    console.log('🎬 Tap detected - transitioning videos');
    
    // Prevent multiple video transitions
    if (videoTransitionStarted) {
      console.log('🎬 Video transition already in progress, ignoring tap');
      return;
    }
    
    // Mark video transition as started
    setVideoTransitionStarted(true);
    
    // Fade out the tap image and final text
    tapImageOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) });
    finalTextOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) });
    
    // Shrink and fade out first video
    video1Scale.value = withTiming(0.1, { duration: 800, easing: Easing.out(Easing.quad) });
    videoOpacity.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) });
    
    // Fade in and scale down second video
    video2Opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
    video2Scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
    
    // Start playing the second video
    setTimeout(() => {
      if (video2Ref.current) {
        video2Ref.current.playAsync().catch(error => console.log('Video 2 play error:', error));
      }
    }, 400); // Start playing halfway through the transition
    
    // Start the calm brain text animation sequence only if it hasn't been completed
    if (!calmBrainAnimationCompleted) {
      startCalmBrainAnimation();
    }
  };
  
  // Calm brain text animation sequence
  const startCalmBrainAnimation = () => {
    console.log('🎬 Starting calm brain text animation');
    
    // 1) Show "This is a calm brain" text
    setTimeout(() => {
      console.log('🎬 Showing calm brain text');
      calmBrainOpacity.value = withTiming(1, { duration: DUR.fade, easing: Easing.out(Easing.quad) });
      calmBrainY.value = withTiming(0, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
    }, 1000 + 1500); // 1 second after video transition starts
    
    // 2) After pause, show theta waves text and shift calm brain text up
    setTimeout(() => {
      console.log('🎬 Showing theta waves text and shifting calm brain');
      
      // Show theta waves text
      thetaWavesOpacity.value = withTiming(1, { duration: DUR.fade, easing: Easing.out(Easing.quad) });
      thetaWavesY.value = withTiming(0, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
      
      // Shift calm brain text up and dim it (same as "Hey there" animation)
      calmBrainShiftedY.value = withTiming(POS.pushUp, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
      calmBrainOpacity.value = withTiming(0.6, { duration: DUR.fade, easing: Easing.out(Easing.quad) });
    }, 3000 + 3000); // 3 seconds after calm brain text appears
    
    // 3) After pause, fade out current text and show theta state text
    setTimeout(() => {
      console.log('🎬 Transitioning to theta state text');
      
      // Fade out and move up current text
      calmBrainOpacity.value = withTiming(0, { duration: DUR.fade, easing: Easing.out(Easing.quad) });
      calmBrainShiftedY.value = withTiming(-200, { duration: DUR.slide, easing: Easing.out(Easing.quad) }); // Move up dramatically
      
      thetaWavesOpacity.value = withTiming(0, { duration: DUR.fade, easing: Easing.out(Easing.quad) });
      thetaWavesY.value = withTiming(-160, { duration: DUR.slide, easing: Easing.out(Easing.quad) }); // Move up dramatically
      
      // Show theta state text
      thetaStateOpacity.value = withTiming(1, { duration: DUR.fade, easing: Easing.out(Easing.quad) });
      thetaStateY.value = withTiming(0, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
      
      // Mark animation as completed
      setCalmBrainAnimationCompleted(true);
    }, 6000 + 4750); // 6 seconds after calm brain text appears (3 seconds after theta waves)
    
    // 4) Final stage: Show CTA text/button and move video up
    setTimeout(() => {
      console.log('🎬 Final stage: showing CTA and moving video up');
      
      // First fade out and move up "We call this Theta State" text
      thetaStateOpacity.value = withTiming(0, { duration: DUR.fade, easing: Easing.out(Easing.quad) });
      thetaStateY.value = withTiming(-60, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
      
      // After a short delay, move video up and show CTA elements
      setTimeout(() => {
        // Move video upward
        videoY.value = withTiming(-screenHeight * 0.2, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
        
        // Show CTA text
        ctaTextOpacity.value = withTiming(1, { duration: DUR.fade, easing: Easing.out(Easing.quad) });
        ctaTextY.value = withTiming(0, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
        
        // Show CTA button
        ctaButtonOpacity.value = withTiming(1, { duration: DUR.fade, easing: Easing.out(Easing.quad) });
        ctaButtonY.value = withTiming(0, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
        
        // Mark final CTA as ready so button can render
        setFinalCtaReady(true);
      }, 500); // 500ms delay after theta state text fades out
    }, 9000 + 6500); // 9 seconds after calm brain text appears (3 seconds after theta state)
  };

  // opacities
  const o1 = useSharedValue(0); // "Hey there…"
  const o2 = useSharedValue(0); // "Having a bit of trouble sleeping?"
  const o3 = useSharedValue(0); // "Your brain activity…"
  const videoOpacity = useSharedValue(0); // Video layer
  
  // Thought bubble opacities
  const bubble1Opacity = useSharedValue(0);
  const bubble2Opacity = useSharedValue(0);
  const bubble3Opacity = useSharedValue(0);
  
  // Final elements
  const finalTextOpacity = useSharedValue(0);
  const tapImageOpacity = useSharedValue(0);
  const tapImageScale = useSharedValue(0.8); // Start slightly smaller
  
  // Video transition elements
  const video1Scale = useSharedValue(1); // First video scale
  const video1Opacity = useSharedValue(0); // First video opacity (controlled by videoOpacity)
  const video2Opacity = useSharedValue(0); // Second video opacity
  const video2Scale = useSharedValue(1.5); // Second video starts at 1.5x
  
  // Calm brain text elements
  const calmBrainOpacity = useSharedValue(0);
  const calmBrainY = useSharedValue(POS.fromBottom);
  const calmBrainShiftedY = useSharedValue(0); // For upward movement when next text appears
  
  // Theta waves text elements
  const thetaWavesOpacity = useSharedValue(0);
  const thetaWavesY = useSharedValue(POS.fromBottom);
  
  // Theta State text elements
  const thetaStateOpacity = useSharedValue(0);
  const thetaStateY = useSharedValue(POS.fromBottom);
  
  // Final call-to-action elements
  const ctaTextOpacity = useSharedValue(0);
  const ctaTextY = useSharedValue(POS.fromBottom);
  const ctaButtonOpacity = useSharedValue(0); // Start hidden
  const ctaButtonY = useSharedValue(POS.fromBottom);
  
  // Video position for upward movement
  const videoY = useSharedValue(screenHeight * 0.3); // Start from below screen

  // positions (translateY)
  const y1 = useSharedValue(0);
  const y2 = useSharedValue(POS.fromBottom);
  const y3 = useSharedValue(POS.fromBottom);
  const y3Shifted = useSharedValue(0); // For upward movement of brain activity text
  
  // Thought bubble positions (for sideways movement)
  const bubble1X = useSharedValue(20); // Start slightly right
  const bubble2X = useSharedValue(-20); // Start slightly left
  const bubble3X = useSharedValue(15); // Start slightly right
  
  // Final element positions
  const finalTextY = useSharedValue(POS.fromBottom); // Start from bottom like brain activity text

  const a1 = useAnimatedStyle(() => ({
    opacity: o1.value,
    transform: [{ translateY: y1.value }],
  }));
  const a2 = useAnimatedStyle(() => ({
    opacity: o2.value,
    transform: [{ translateY: y2.value }],
  }));
  const a3 = useAnimatedStyle(() => ({
    opacity: o3.value,
    transform: [{ translateY: y3.value + y3Shifted.value }],
  }));
  
  const videoStyle = useAnimatedStyle(() => ({
    opacity: videoOpacity.value,
    transform: [{ scale: video1Scale.value }, { translateY: videoY.value }],
  }));
  
  const video2Style = useAnimatedStyle(() => ({
    opacity: video2Opacity.value,
    transform: [{ scale: video2Scale.value }, { translateY: videoY.value }],
  }));
  
  // Thought bubble animated styles
  const bubble1Style = useAnimatedStyle(() => ({
    opacity: bubble1Opacity.value,
    transform: [{ translateX: bubble1X.value }],
  }));
  
  const bubble2Style = useAnimatedStyle(() => ({
    opacity: bubble2Opacity.value,
    transform: [{ translateX: bubble2X.value }],
  }));
  
  const bubble3Style = useAnimatedStyle(() => ({
    opacity: bubble3Opacity.value,
    transform: [{ translateX: bubble3X.value }],
  }));
  
  // Final element animated styles
  const finalTextStyle = useAnimatedStyle(() => ({
    opacity: finalTextOpacity.value,
    transform: [{ translateY: finalTextY.value }],
  }));
  
  const tapImageStyle = useAnimatedStyle(() => ({
    opacity: tapImageOpacity.value,
    transform: [{ scale: tapImageScale.value }],
  }));
  
  const calmBrainStyle = useAnimatedStyle(() => ({
    opacity: calmBrainOpacity.value,
    transform: [{ translateY: calmBrainY.value + calmBrainShiftedY.value }],
  }));
  
  const thetaWavesStyle = useAnimatedStyle(() => ({
    opacity: thetaWavesOpacity.value,
    transform: [{ translateY: thetaWavesY.value }],
  }));
  
  const thetaStateStyle = useAnimatedStyle(() => ({
    opacity: thetaStateOpacity.value,
    transform: [{ translateY: thetaStateY.value }],
  }));
  
  const ctaTextStyle = useAnimatedStyle(() => ({
    opacity: ctaTextOpacity.value,
    transform: [{ translateY: ctaTextY.value }],
  }));
  
  const ctaButtonStyle = useAnimatedStyle(() => ({
    opacity: ctaButtonOpacity.value,
    transform: [{ translateY: ctaButtonY.value }],
  }));
  
  const videoShiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: videoY.value }],
  }));

  // sequence
  useEffect(() => {
    console.log('🎬 Starting onboarding animation sequence');
    
    // 1) Show "Hey there…" with a simple fade
    o1.value = withTiming(1, { duration: DUR.fade, easing: Easing.out(Easing.quad) });
    
    // 2) After hold, show second line and nudge first line up
    const timer1 = setTimeout(() => {
      console.log('🎬 Showing second line');
      o2.value = withTiming(1, { duration: DUR.fade });
      y2.value = withTiming(0, { duration: DUR.slide });
      
      // Nudge "Hey there…" up and dim it slightly
      y1.value = withTiming(POS.pushUp, { duration: DUR.slide });
      o1.value = withTiming(0.5, { duration: DUR.fade });
    }, DUR.hold1);
    
    // 3) Fade out first two lines and show third line
    const timer2 = setTimeout(() => {
      console.log('🎬 Showing third line');
      
      // Fade out first two lines and slide them up
      o1.value = withTiming(0, { duration: DUR.fade });
      o2.value = withTiming(0, { duration: DUR.fade });
      y1.value = withTiming(-150, { duration: DUR.slide }); // Move "Hey there" up dramatically
      y2.value = withTiming(-80, { duration: DUR.slide }); // Move second line up more too
      
      // Show third line after a short delay
      setTimeout(() => {
        o3.value = withTiming(1, { duration: DUR.fade });
        y3.value = withTiming(0, { duration: DUR.slide });
      }, DUR.fade * 0.6);
    }, DUR.hold1 + DUR.fade + DUR.hold2);
    
    // 4) Shift brain activity text upward and fade in video
    const timer3 = setTimeout(() => {
      console.log('🎬 Shifting text upward and showing video');
      
      // Shift brain activity text upward by 30% of screen height
      y3Shifted.value = withTiming(-screenHeight * 0.25, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
      
      // Fade in video layer and move it up from bottom
      videoOpacity.value = withTiming(1, { duration: DUR.fade });
      videoY.value = withTiming(0, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
      
      // Start playing video after a short delay to ensure it's ready
      setTimeout(() => {
        try {
          if (videoRef.current) {
            videoRef.current.playAsync().catch(error => {
              console.log('Video play error:', error);
            });
          }
        } catch (error) {
          console.log('Video ref error:', error);
        }
      }, 100); // 100ms delay
    }, DUR.hold1 + DUR.fade + DUR.hold2 + DUR.fade + DUR.slide + 1000 + 1000); // Extra 1 second hold
    
    // 5) Animate thought bubbles with 1-second gaps
    const bubble1Timer = setTimeout(() => {
      console.log('🎬 Showing first thought bubble');
      bubble1Opacity.value = withTiming(1, { duration: DUR.fastslide });
      bubble1X.value = withTiming(0, { duration: DUR.fastslide, easing: Easing.out(Easing.quad) });
    }, DUR.hold1 + DUR.fade + DUR.hold2 + DUR.fade + DUR.slide + 1000 + 500 + 2500); // 500ms after video starts
    
    const bubble2Timer = setTimeout(() => {
      console.log('🎬 Showing second thought bubble');
      bubble2Opacity.value = withTiming(1, { duration: DUR.fastslide });
      bubble2X.value = withTiming(0, { duration: DUR.fastslide, easing: Easing.out(Easing.quad) });
    }, DUR.hold1 + DUR.fade + DUR.hold2 + DUR.fade + DUR.slide + 1000 + 1500 + 3000); // 1 second after first bubble
    
    const bubble3Timer = setTimeout(() => {
      console.log('🎬 Showing third thought bubble');
      bubble3Opacity.value = withTiming(1, { duration: DUR.fastslide });
      bubble3X.value = withTiming(0, { duration: DUR.fastslide, easing: Easing.out(Easing.quad) });
    }, DUR.hold1 + DUR.fade + DUR.hold2 + DUR.slide + 1000 + 2500 + 3500); // 1 second after second bubble
    
    // 6) Fade out brain activity text and thought bubbles with opposite movements
    const finalAnimationTimer = setTimeout(() => {
      console.log('🎬 Final animation - fading out text and bubbles');
      
      // Brain activity text fades out and shifts upward quickly
      o3.value = withTiming(0, { duration: DUR.fade * 0.5 }); // Faster fade
      y3Shifted.value = withTiming(-screenHeight * 0.6, { duration: DUR.slide * 0.5, easing: Easing.out(Easing.quad) }); // Shift up more
      
      // Thought bubbles fade out and shift in opposite directions
      // Bubble 1 (came from right) shifts back to the right
      bubble1Opacity.value = withTiming(0, { duration: DUR.fade * 0.5 });
      bubble1X.value = withTiming(40, { duration: DUR.slide * 0.5, easing: Easing.out(Easing.quad) });
      
      // Bubble 2 (came from left) shifts back to the left
      bubble2Opacity.value = withTiming(0, { duration: DUR.fade * 0.5 });
      bubble2X.value = withTiming(-40, { duration: DUR.slide * 0.5, easing: Easing.out(Easing.quad) });
      
      // Bubble 3 (came from right) shifts back to the right
      bubble3Opacity.value = withTiming(0, { duration: DUR.fade * 0.5 });
      bubble3X.value = withTiming(50, { duration: DUR.slide * 0.5, easing: Easing.out(Easing.quad) });
    }, DUR.hold1 + DUR.fade + DUR.hold2 + DUR.fade + DUR.slide + 1000 + 2500 + 2000 + 4000); // 2 seconds after last bubble
    
    // 7) Show final text and tap image
    const finalElementsTimer = setTimeout(() => {
      console.log('🎬 Showing final elements');
      
      // Final text fades in and slides up from bottom
      finalTextOpacity.value = withTiming(1, { duration: DUR.fade });
      finalTextY.value = withTiming(0, { duration: DUR.slide, easing: Easing.out(Easing.quad) });
      
      // Tap image fades in
      tapImageOpacity.value = withTiming(1, { duration: DUR.fade });
      
      // Start the grow/shrink loop animation using withRepeat for smooth transitions
      tapImageScale.value = withRepeat(
        withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1, // Infinite repeat
        true // Reverse the animation for smooth looping
      );
      
      // Mark tap image as ready for interaction
      setTapImageReady(true);
    }, DUR.hold1 + DUR.fade + DUR.hold2 + DUR.fade + DUR.slide + 1000 + 2500 + 2000 + 1000 + 5000); // 1 second after fade-out

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(bubble1Timer);
      clearTimeout(bubble2Timer);
      clearTimeout(bubble3Timer);
      clearTimeout(finalAnimationTimer);
      clearTimeout(finalElementsTimer);
      
      // Clean up video when component unmounts
      if (videoRef.current) {
        try {
          videoRef.current.stopAsync();
        } catch (error) {
          console.log('Video stop error:', error);
        }
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Bottom Layer - Solid Color Background */}
      <View style={styles.solidBackground} />
      
      {/* Video Layer 1 - Orb-1.mp4 */}
      <Animated.View style={[styles.videoContainer, videoStyle]}>
        <Video
          ref={videoRef}
          source={require('../assets/video/Orb-1.mp4')}
          style={styles.video}
          shouldPlay={false}
          isLooping={true}
          isMuted={true}
          resizeMode={ResizeMode.COVER}
          onLoad={() => console.log('Video 1 loaded successfully')}
          onError={(error) => console.log('Video 1 load error:', error)}
        />
      </Animated.View>
      
      {/* Video Layer 2 - Orb-2.mp4 */}
      <Animated.View style={[styles.videoContainer, video2Style]}>
        <Video
          ref={video2Ref}
          source={require('../assets/video/Orb-2.mp4')}
          style={styles.video}
          shouldPlay={false}
          isLooping={true}
          isMuted={true}
          resizeMode={ResizeMode.COVER}
          onLoad={() => console.log('Video 2 loaded successfully')}
          onError={(error) => console.log('Video 2 load error:', error)}
        />
      </Animated.View>
      
      {/* Image Layer - THETA-BG-TRANS.png */}
      <ImageBackground
        source={require('../assets/images/THETA-BG-TRANS.png')}
        style={styles.imageBackground}
        resizeMode="cover"
      >
        <View style={styles.imageOverlay} />
      </ImageBackground>
      
      {/* Text Layer - Animated Content */}
      <View style={styles.center}>
        <Animated.Text style={[styles.heyThere, a1]}>
          Hey there…
        </Animated.Text>

        <Animated.View style={[styles.blockUnder, a2]}>
          <Text style={styles.bigText}>Having a bit of</Text>
          <Text style={styles.bigText}>trouble sleeping?</Text>
        </Animated.View>

        <Animated.View style={[styles.blockUnder, a3]}>
          <Text style={styles.bodyText}>
            Your <Text style={styles.emph}>brain activity</Text>
          </Text>
          <Text style={styles.bodyText}>might look a little</Text>
          <Text style={styles.bodyText}>like this…</Text>
        </Animated.View>
      </View>

              {/* Thought Bubbles */}
        <Animated.View style={[styles.thoughtBubble, styles.bubble1, bubble1Style]}>
          <Text style={styles.bubbleText}>Did I remember to...</Text>
        </Animated.View>
        
        <Animated.View style={[styles.thoughtBubble, styles.bubble2, bubble2Style]}>
          <Text style={styles.bubbleText}>I need to sleep right now</Text>
        </Animated.View>
        
        <Animated.View style={[styles.thoughtBubble, styles.bubble3, bubble3Style]}>
          <Text style={styles.bubbleText}>Work is going to be so busy</Text>
        </Animated.View>
        
        {/* Final Text */}
        <Animated.Text style={[styles.finalText, finalTextStyle]}>
          Tap to calm the activity
        </Animated.Text>
        
        {/* Calm Brain Text */}
        <Animated.Text style={[styles.calmBrainText, calmBrainStyle]}>
          This is a calm brain
        </Animated.Text>
        
        {/* Theta Waves Text */}
        <Animated.Text style={[styles.thetaWavesText, thetaWavesStyle]}>
          It's full of sleep-inducing{' '}
          <Text style={styles.thetaHighlight}>Theta waves.</Text>
        </Animated.Text>
        
        {/* Theta State Text */}
        <Animated.Text style={[styles.thetaStateText, thetaStateStyle]}>
          We call this Theta&nbsp;State{' '}
        </Animated.Text>
        
        {/* Final Call-to-Action Text */}
        <Animated.Text style={[styles.ctaText, ctaTextStyle]}>
          Now let's get you&nbsp;there
        </Animated.Text>
        
        {/* Calm My Mind Button - Only render when final CTA is ready */}
        {finalCtaReady && (
          <TouchableOpacity 
            style={[styles.ctaButton, ctaButtonStyle]}
            onPress={() => {
              console.log('🎬 Calm my mind button pressed');
              // Navigate to home or next screen
              router.push('/onboarding-coach');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Calm my mind</Text>
          </TouchableOpacity>
        )}
        
        {/* Tap Image Overlay - Perfectly Centered and Tappable */}
        <TouchableOpacity 
          style={styles.tapImageContainer} 
          onPress={tapImageReady ? handleTapImage : undefined}
          activeOpacity={tapImageReady ? 0.8 : 1}
          disabled={!tapImageReady}
        >
          <Animated.Image
            source={require('../assets/images/tap.png')}
            style={[styles.tapImage, tapImageStyle]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Exit Button */}
        <TouchableOpacity
          style={styles.exitButton}
          onPress={async () => {
            await setStorageItem('hasOnboarded', '1');
            router.push('/onboarding-coach');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.exitButtonText}>Skip</Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  solidBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#15131A',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  video: {
    flex: 1,
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
    paddingHorizontal: 28,
  },

  // line 1
  heyThere: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    ...FONTS.heyThere,
  },

  // stacked blocks that enter from below
  blockUnder: {
    position: 'absolute',
    top: '45%',
    transform: [{ translateY: 0 }],
    alignItems: 'center',
  },

  bigText: {
    color: 'white',
    textAlign: 'center',
    ...FONTS.big,
  },
  bodyText: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    ...FONTS.body,
  },
  emph: {
    color: '#F6EE9A', // soft yellow highlight
    fontWeight: '700',
  },
  exitButton: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 1000,
  },
  exitButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Light',
  },
  thoughtBubble: {
    position: 'absolute',
    backgroundColor: 'rgba(121, 75, 214, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bubble1: {
    top: '35%',
    right: '15%',
  },
  bubble2: {
    top: '50%',
    left: '10%',
  },
  bubble3: {
    top: '65%',
    right: '15%',
  },
  bubbleText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    textAlign: 'center',
  },
  finalText: {
    position: 'absolute',
    bottom: '20%',
    color: 'white',
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Medium',
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  calmBrainText: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    color: 'white',
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Medium',
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  thetaWavesText: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Medium',
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  thetaHighlight: {
    color: '#F6EE9A', // soft yellow highlight
    fontFamily: 'PlusJakartaSans-Bold',
  },
  thetaStateText: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    color: 'white',
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Medium',
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  ctaText: {
    position: 'absolute',
    bottom: '42%',
    left: 0,
    right: 0,
    color: 'white',
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Medium',
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  ctaButton: {
    position: 'absolute',
    bottom: '30%',
    left: '10%',
    right: '10%',
    backgroundColor: '#7B4BD6', // Purple gradient base
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-SemiBold',
    textAlign: 'center',
  },
  tapImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Ensure it's above other elements
  },
  tapImage: {
    width: 120,
    height: 120,
  },
});
