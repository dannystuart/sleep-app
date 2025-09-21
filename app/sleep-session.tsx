import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  InteractionManager,
  ImageBackground,
  Image,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../components/SafeAreaView';
import { useApp } from '../contexts/AppContext';
import { ChevronLeft, Play, Pause, SkipBack, Clock, PauseCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { track } from '../lib/analytics';

export default function SleepSessionScreen() {
  const router = useRouter();
  const { coaches, classes, sessionAudio, selectedCoachId, selectedClassId, timerSeconds, logEvent, isLoading, streak } = useApp();
  const coach = coaches.find(c => c.id === selectedCoachId);
  const cls = classes.find(c => c.id === selectedClassId);
  
  // Get the audio URL for this coach+class combination
  const sessionAudioEntry = sessionAudio.find(
    sa => sa.coach_id === selectedCoachId && sa.class_id === selectedClassId
  );
  const audioUrl = sessionAudioEntry?.audio_url;

  // Early return if data is not ready or selections are invalid
  if (isLoading || !coach || !cls) {
    return (
      <View style={{flex:1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: 'white', fontSize: 18, fontFamily: 'DMSans'}}>Loading session...</Text>
      </View>
    );
  }

  // Check if audio is available for this combination
  const hasAudio = audioUrl && !audioUrl.includes('example.com');

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [audioPosition, setAudioPosition] = useState(0);
  const [length, setLength] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const soundRef = useRef<Audio.Sound|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const sessionEndTime = useRef<number>(0);
  const pausedAtTime = useRef<number>(0);
  const progressBarRef = useRef<View>(null);
  const [progressBarWidth, setProgressBarWidth] = useState(300);

  // Get the display name for the selected class
  const getClassDisplayName = () => {
    // Check if it's a mixed level class by name or tags
    if (cls.name.toLowerCase().includes('mixed') || 
        cls.tags?.includes('Maths') && cls.tags?.includes('Memory') && cls.tags?.includes('Word') && cls.tags?.includes('Facts')) {
      return 'All Tasks';
    }
    
    // For individual classes, map the name to display name
    const classDisplayNames: { [key: string]: string } = {
      'Maths': 'Maths',
      'Memory': 'Memory', 
      'Word': 'Word',
      'Facts': 'Facts'
    };
    
    return classDisplayNames[cls.name] || cls.name || 'Select Class';
  };

  // 1) preload background
  useEffect(() => {
    Asset.loadAsync(require('../assets/images/THETA-BG.png'));
  }, []);

  // 2) defer session setup until after nav animation
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => startSession());
    return () => {
      task.cancel?.();
      cleanupSession();
    };
  }, []);

  // fade in on load **or** error
  const onBgLoad = () => animateIn();
  const onBgError = () => {
    console.warn('BG image failed to load');
    animateIn();
  };
  const animateIn = () => {
    Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  // session logic - load & play one track
  const startSession = async () => {
    try {
      console.log('🚀 Starting session with timer:', timerSeconds, 'minutes');
      
      // 1. Analytics
      await logEvent({ 
        event_type: 'session_start', 
        coach_id: coach.id, 
        class_id: cls.id, 
        timer_seconds: timerSeconds 
      });
      
      // Analytics tracking for separate stream
      track('session_start', {
        coach_id: coach.id,
        class_id: cls.id,
        timer_seconds: timerSeconds,
      }).catch(() => {});
      
      // 2. Configure audio mode
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
      
      // 3. Check if audio URL is valid
      if (!hasAudio) {
        console.warn('🔇 No audio available for this coach+class combination, running timer-only session');
        // Start timer without audio
        sessionEndTime.current = Date.now() + timerSeconds * 60_000;
        console.log('⏰ Timer-only session end time:', new Date(sessionEndTime.current).toLocaleTimeString());
        startTimer();
        return;
      }
      
      // 4. Load & play the single MP3
      console.log('🎵 Loading audio:', audioUrl);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onPlaybackStatus);
      setIsPlaying(true);
      
      // 5. Start countdown timer
      sessionEndTime.current = Date.now() + timerSeconds * 60_000;
      console.log('⏰ Session end time set to:', new Date(sessionEndTime.current).toLocaleTimeString());
      startTimer();
    } catch (error) {
      console.error('❌ Error starting session:', error);
      // Fallback: start timer without audio
      sessionEndTime.current = Date.now() + timerSeconds * 60_000;
      startTimer();
    }
  };

  // Playback status handler - updates UI but does not load another sound
  const onPlaybackStatus = (status: any) => {
    if (!status.isLoaded) return;
    setLength(status.durationMillis || length);
    setIsPlaying(status.isPlaying);
    setIsPaused(status.isPaused || !status.isPlaying);
    setAudioPosition(status.positionMillis || 0);
  };

  // Finish & cleanup when timer ends
  const finishSession = async () => {
    console.log('🎯 finishSession called!');
    try {
      clearInterval(timerRef.current!);
      console.log('📊 Logging session event...');
      await logEvent({ 
        event_type: 'session_complete', 
        coach_id: coach.id, 
        class_id: cls.id, 
        timer_seconds: timerSeconds 
      });
      
      // Analytics tracking for separate stream
      track('session_complete', {
        coach_id: coach.id,
        class_id: cls.id,
        timer_seconds: timerSeconds,
      }).catch(() => {});

      console.log('🔥 Updating streak and diary...');
      // NEW: update streak + diary
      const result = await streak.onSessionComplete({ 
        coachName: coach.name, 
        className: getClassDisplayName() 
      });
      console.log('✅ Streak update result:', result);

      cleanupSession();
      router.back();
    } catch (error) {
      console.error('❌ Error finishing session:', error);
      cleanupSession();
      router.back();
    }
  };

  const cleanupSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    soundRef.current?.unloadAsync().catch(console.error);
  };

  // Play/Pause toggle
  const togglePlay = () => {
    if (!soundRef.current) {
      console.warn('No audio available to play');
      return;
    }
    
    if (isPlaying) {
      soundRef.current.pauseAsync();
      setIsPaused(true);
      pauseTimer();
    } else {
      soundRef.current.playAsync();
      setIsPaused(false);
      resumeTimer();
    }
  };

  // Back early handler
  const goBackEarly = () => {
    // Analytics tracking for separate stream
    track('session_abandoned', {
      coach_id: coach.id,
      class_id: cls.id,
    }).catch(() => {});
    
    cleanupSession();
    router.back();
  };

  const progress = length ? audioPosition/length : 0;
  const fmt = (ms:number) => {
    const s=Math.floor(ms/1000), m=Math.floor(s/60), sec=s%60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  // Timer management functions
  const startTimer = () => {
    console.log('⏰ Starting timer for', timerSeconds, 'minutes');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, sessionEndTime.current - Date.now());
      const sessionProgress = timerSeconds * 60_000 - rem;
      setPosition(sessionProgress);
      
      // Debug timer progress
      if (Math.floor(rem / 1000) % 10 === 0) { // Log every 10 seconds
        console.log('⏱️ Timer remaining:', Math.floor(rem / 1000), 'seconds');
      }
      
      if (rem <= 0) {
        console.log('🎯 Timer finished - calling finishSession');
        finishSession();
      }
    }, 500);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pausedAtTime.current = Date.now();
  };

  const resumeTimer = () => {
    const pauseDuration = Date.now() - pausedAtTime.current;
    sessionEndTime.current += pauseDuration;
    startTimer();
  };

  // Seek functionality
  const seekTo = (seekPercentage: number) => {
    if (!soundRef.current || !length) return;
    
    const seekTime = (seekPercentage / 100) * length;
    soundRef.current.setPositionAsync(seekTime);
    setAudioPosition(seekTime);
    // Don't update session position - that should continue based on real time
  };

  const onProgressBarPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const seekPercentage = (locationX / progressBarWidth) * 100;
    seekTo(Math.max(0, Math.min(100, seekPercentage)));
  };

  return (
    <View style={{flex:1}}>
      {/* fallback solid bg */}
      <View style={styles.fallback} />

      {/* animated image on top */}
      <ImageBackground
        source={require('../assets/images/THETA-BG.png')}
        style={StyleSheet.absoluteFill}
        onLoad={onBgLoad}
        onError={onBgError}
        resizeMode="cover"
      >
        <Animated.View style={[StyleSheet.absoluteFill, { opacity:bgOpacity }]} />
      </ImageBackground>

      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBackEarly}>
            <ChevronLeft color="white" size={24}/>
          </TouchableOpacity>
          <Text style={styles.title}>Sleep Session</Text>
          <View style={{width:24}}/>
        </View>

        {/* PROFILE SECTION */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={{ uri: coach.image_url || 'https://via.placeholder.com/200x200' }}
              style={styles.profileImage}
            />
            <View style={styles.nameTag}>
              <Text style={styles.nameTagText}>{coach.name}</Text>
            </View>
          </View>
          
          {/* CLASS CARD */}
          <View style={styles.classCard}>
            <Text style={styles.classCardTitle}>Class</Text>
            <Text style={styles.classCardText}>{getClassDisplayName()}</Text>
          </View>
        </View>

        {/* DURATION SECTION */}
        <View style={styles.durationSection}>
          <View style={styles.durationRow}>
            <Clock color="white" size={20} />
            <Text style={styles.durationText}>{timerSeconds} minutes</Text>
          </View>
        </View>

        {/* PLAY BUTTON */}
        <View style={styles.playButtonSection}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={togglePlay}
            disabled={!hasAudio || !soundRef.current}
            style={(!hasAudio || !soundRef.current) && styles.playButtonDisabled}
          >
            <LinearGradient
              colors={isPlaying ? ['#413A6D', '#221D55'] : ['#B3ACE9', '#5B45DD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.outerCircle}
            >
              <LinearGradient
                colors={isPlaying ? ['#381E6D', '#161E4B'] : ['#794BD6', '#585ED2']}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={styles.innerCircle}
              >
                {isPlaying ? (
                  <Image 
                  source={require('../assets/images/pause-icon.png')}
                  style={styles.playIcon}
                />
                ) : (
                  <Image 
                    source={require('../assets/images/play-btn-icon.png')}
                    style={styles.playIcon}
                  />
                )}
              </LinearGradient>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* PROGRESS BAR */}
        <View style={styles.progressSection}>
          <TouchableOpacity 
            style={styles.progressBarContainer} 
            onPress={hasAudio ? onProgressBarPress : undefined}
            activeOpacity={hasAudio ? 0.8 : 1}
            disabled={!hasAudio}
          >
            <View 
              ref={progressBarRef}
              style={[styles.progressBar, !hasAudio && styles.progressBarDisabled]}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setProgressBarWidth(width);
              }}
            >
              <View style={[styles.progressFill, { width:`${progress*100}%` }]} />
            </View>
          </TouchableOpacity>
          <View style={styles.progressTimer}>
          <Text style={styles.timeText}>{fmt(audioPosition)}</Text>
          <Text style={styles.fullText}>{fmt(length)}</Text>
          </View>
        </View>

        {/* TEST BUTTON - Remove this after testing */}
        {/* <View style={styles.testSection}>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => {
              console.log('🧪 Test button pressed - manually completing session');
              finishSession();
            }}
          >
            <Text style={styles.testButtonText}>🧪 Complete Session (Test)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: '#4CAF50', marginTop: 10 }]}
            onPress={() => {
              console.log('🧪 Manual streak increment test button pressed');
              console.log('🔍 streak object:', streak);
              console.log('🔍 testIncrementStreak function:', streak.testIncrementStreak);
              if (streak.testIncrementStreak) {
                console.log('✅ Calling testIncrementStreak...');
                streak.testIncrementStreak();
              } else {
                console.log('❌ testIncrementStreak function not found');
              }
            }}
          >
            <Text style={styles.testButtonText}>🧪 Increment Streak (Test)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: '#FF9800', marginTop: 10 }]}
            onPress={() => {
              console.log('🧪 Direct streak test - calling finishSession directly');
              finishSession();
            }}
          >
            <Text style={styles.testButtonText}>🧪 Direct Session Complete</Text>
          </TouchableOpacity>
        </View> */}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  container: {
    flex: 1, 
    paddingHorizontal: 20
  },
  header: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 16, 
    marginBottom: 40
  },
  title: {
    color: 'white', 
    fontSize: 20, 
    fontWeight: '300',
    fontFamily: 'DMSans'
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 240,
    height: 220,
    borderRadius: 24,
    backgroundColor: 'rgba(147, 112, 219, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  nameTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(147, 112, 219, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  nameTagText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DMSans',
  },
  classCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 240,
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    marginTop: 16,
  },
  classCardText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'DMSans',
  },

  classCardTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '400',
    fontFamily: 'DMSans',
  },

  durationSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '400',
    fontFamily: 'DMSans',
  },
  playButtonSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  outerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#3e2d86',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  playIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  progressSection: {
    alignItems: 'center',
  },
  progressBarContainer: {
    alignItems: 'center',
    marginVertical: 4,
    paddingVertical: 8,
    width: '100%',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 2, 
    overflow: 'hidden', 
    width: '100%',
  },
  progressFill: {
    height: '100%', 
    backgroundColor: 'white', 
    borderRadius: 2,
  },
  progressBarDisabled: {
    opacity: 0.5,
  },
  timeText: {
    color: 'white', 
    textAlign: 'center',
    fontSize: 14,
    marginTop: 0,
    fontFamily: 'DMSans',
  },
  progressTimer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  fullText: {
    color: 'white', 
    textAlign: 'center',
    fontSize: 14,
    marginTop: 0,
    fontFamily: 'DMSans',
  },
  // testSection: {
  //   alignItems: 'center',
  //   marginTop: 20,
  // },
  // testButton: {
  //   backgroundColor: '#FF6B6B',
  //   paddingHorizontal: 20,
  //   paddingVertical: 12,
  //   borderRadius: 8,
  // },
  // testButtonText: {
  //   color: 'white',
  //   fontSize: 14,
  //   fontWeight: '600',
  // },

}); 