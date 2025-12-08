import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  InteractionManager,
  AppState,
  PanResponder,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
// Try direct import first, fall back to safe wrapper
let TrackPlayerDirect: any = null;
let TrackPlayerEventDirect: any = null;
let TrackPlayerStateDirect: any = null;
let directLoadError: string | null = null;

try {
  const rntp = require('react-native-track-player');
  // The TrackPlayer methods are on the default export
  if (rntp.default && typeof rntp.default.setupPlayer === 'function') {
    TrackPlayerDirect = rntp.default;
  } else if (typeof rntp.setupPlayer === 'function') {
    TrackPlayerDirect = rntp;
  } else {
    throw new Error('TrackPlayer methods not found');
  }
  // Event and State are named exports, not properties of default
  TrackPlayerEventDirect = rntp.Event;
  TrackPlayerStateDirect = rntp.State;
  console.log('✅ Direct TrackPlayer import successful, Event:', !!TrackPlayerEventDirect, 'State:', !!TrackPlayerStateDirect, 'Methods:', !!TrackPlayerDirect.play);
} catch (e: any) {
  directLoadError = e?.message || 'Unknown error';
  console.log('ℹ️ Direct TrackPlayer import failed:', directLoadError);
}

import { TrackPlayer as TrackPlayerSafe, getEventConstant, getStateConstant, isTrackPlayerSupported, getDetectionLog } from '../../lib/audio/trackPlayerSafe';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useApp } from '../../contexts/AppContext';
import { ChevronDown, Play, Pause, SkipBack, Clock, PauseCircle, ArrowDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { track } from '../../lib/analytics';
import { ACTIVE_SESSION_STORAGE_KEY, PLAYER_STATE_STORAGE_KEY } from '../../lib/audio/constants';

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

  // Check if TrackPlayer is available (not in Expo Go)
  // Prefer direct import constants if available
  const TrackPlayerEvent = TrackPlayerEventDirect || getEventConstant();
  const TrackPlayerState = TrackPlayerStateDirect || getStateConstant();
  const isTrackPlayerReady = (!!TrackPlayerDirect || isTrackPlayerSupported()) && TrackPlayerEvent && TrackPlayerState;

  // Check if audio is available for this combination
  const hasAudio = audioUrl && !audioUrl.includes('example.com') && isTrackPlayerReady;

  // One-time debug logging on mount
  const hasLoggedRef = useRef(false);
  useEffect(() => {
    if (!hasLoggedRef.current) {
      hasLoggedRef.current = true;
      console.log('🎵 Sleep Session Audio Debug:', {
        directImportWorked: !!TrackPlayerDirect,
        directLoadError,
        isTrackPlayerSupported: isTrackPlayerSupported(),
        isTrackPlayerReady,
        hasAudio,
        audioUrl: audioUrl || '(none)',
        detectionLog: getDetectionLog(),
      });
    }
  }, []);

  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // TrackPlayer state
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


  // 2) defer session setup until after nav animation
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => startSession());
    return () => {
      task.cancel?.();
      cleanupSession();
    };
  }, [selectedCoachId, selectedClassId, timerSeconds]); // Restart session when parameters change

  // AppState guard - if app wakes after timer elapsed, end immediately
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        if (hasAudio && isTrackPlayerReady && TrackPlayerDirect) {
          try {
            const trackPlayerState = await TrackPlayerDirect.getState();
            const isCurrentlyPlaying = trackPlayerState === TrackPlayerState.Playing;
            console.log('📱 App became active, syncing state:', isCurrentlyPlaying);
            if (isCurrentlyPlaying !== isPlaying) {
              setIsPlaying(isCurrentlyPlaying);
              if (isCurrentlyPlaying) {
                resumeTimer();
              } else {
                pauseTimer();
              }
            }
          } catch (error) {
            console.warn('Failed to sync state on app active:', error);
          }
        }

        if (sessionEndTime.current && Date.now() >= sessionEndTime.current) {
          if (TrackPlayerDirect) {
            try {
              await TrackPlayerDirect.stop();
            } catch {}
          }
          finishSession();
        }
      }
    });

    let playbackSub: any = null;
    if (isTrackPlayerReady && TrackPlayerDirect) {
      playbackSub = TrackPlayerDirect.addEventListener(
        TrackPlayerEvent.PlaybackState,
        async ({ state }: { state: any }) => {
        console.log('🎵 Playback state updated (component listener):', state);
        if (state === TrackPlayerState.Playing) {
          if (!isPlaying) {
            setIsPlaying(true);
            resumeTimer();
          }
          await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'playing');
        } else if (state === TrackPlayerState.Paused || state === TrackPlayerState.Stopped) {
          if (isPlaying) {
            setIsPlaying(false);
            pauseTimer();
          }
          await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'paused');
        }
      });
    }

    return () => {
      sub.remove();
      playbackSub?.remove();
    };
  }, [hasAudio, isPlaying]);


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
      
      // 2. Check if audio URL is valid
      if (!hasAudio) {
        console.warn('🔇 No audio available (or Expo Go mode), running timer-only session');
        // Start timer without audio
        sessionEndTime.current = Date.now() + timerSeconds * 60_000;
        console.log('⏰ Timer-only session end time:', new Date(sessionEndTime.current).toLocaleTimeString());
        setIsPlaying(true); // Set playing state for UI
        startTimer();
        return;
      }
      
      // 3. Ensure TrackPlayer is initialized before using it
      console.log('🎵 Loading audio:', audioUrl);
      if (isTrackPlayerReady && TrackPlayerDirect) {
        try {
          // First ensure player is set up (idempotent - won't reinitialize if already done)
          try {
            await TrackPlayerDirect.getState();
            console.log('✅ TrackPlayer already initialized');
          } catch {
            console.log('🎵 Initializing TrackPlayer...');
            await TrackPlayerDirect.setupPlayer({ waitForBuffer: true });
            console.log('✅ TrackPlayer initialized');
          }
          
          // Now we can safely use the player
          await TrackPlayerDirect.reset();
          await TrackPlayerDirect.add({
            id: `${coach.id}-${cls.id}`,
            url: audioUrl!,
            title: `${coach.name} — ${getClassDisplayName()}`,
            artist: 'Theta',
            artwork: coach.image_url || undefined,
          });
          await TrackPlayerDirect.play();
          setIsPlaying(true);
          console.log('✅ TrackPlayer started successfully');
          await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'playing');
        } catch (trackPlayerError) {
          console.warn('TrackPlayer failed, falling back to timer-only session:', trackPlayerError);
          setIsPlaying(true);
        }
      } else {
        console.warn('TrackPlayer not available, starting timer-only session');
        setIsPlaying(true);
      }
      
      // 4. Set absolute end time (ms since epoch)
      sessionEndTime.current = Date.now() + timerSeconds * 60_000;
      await AsyncStorage.setItem('theta_sleep_end_ts', String(sessionEndTime.current));
      
      // 6. Start countdown timer
      console.log('⏰ Session end time set to:', new Date(sessionEndTime.current).toLocaleTimeString());
      startTimer();
      console.log('✅ Session started successfully');
    } catch (error) {
      console.error('❌ Error starting session:', error);
      // Fallback: start timer without audio
      sessionEndTime.current = Date.now() + timerSeconds * 60_000;
      await AsyncStorage.setItem('theta_sleep_end_ts', String(sessionEndTime.current));
      startTimer();
      console.log('✅ Fallback session started (timer only)');
    }
  };

  // TrackPlayer audio position tracking and state sync
  useEffect(() => {
    if (!hasAudio || !isTrackPlayerReady || !TrackPlayerDirect) return;
    
    const updatePosition = async () => {
      try {
        const position = await TrackPlayerDirect.getPosition();
        const duration = await TrackPlayerDirect.getDuration();
        setAudioPosition(position * 1000); // Convert to milliseconds
        setAudioDuration(duration * 1000); // Convert to milliseconds
      } catch (error) {
        // Silently ignore - player might not be ready yet
      }
    };
    
    // Sync playback state with external controls
    const syncPlaybackState = async () => {
      try {
        const state = await TrackPlayerDirect.getState();
        const isCurrentlyPlaying = state === TrackPlayerState.Playing;
        
        if (isCurrentlyPlaying !== isPlaying) {
          console.log('🔄 Syncing playback state:', isCurrentlyPlaying);
          setIsPlaying(isCurrentlyPlaying);
          
          // Sync timer state
          if (isCurrentlyPlaying) {
            resumeTimer();
          } else {
            pauseTimer();
          }
        }
      } catch (error) {
        console.warn('Failed to sync playback state:', error);
      }
    };
    
    const interval = setInterval(() => {
      updatePosition();
      syncPlaybackState();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [hasAudio, isPlaying]);

  // Finish & cleanup when timer ends
  const finishSession = async () => {
    console.log('🎯 finishSession called!');
    console.log('🎯 Stack trace:', new Error().stack);
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

      // Stop TrackPlayer and clear stored timer
      if (isTrackPlayerReady && TrackPlayerDirect) {
        try {
          await TrackPlayerDirect.stop();
        } catch (error) {
          console.warn('Failed to stop TrackPlayer:', error);
        }
      }
      setIsPlaying(false);
      await AsyncStorage.removeItem('theta_sleep_end_ts');

      console.log('🔥 Updating streak and diary...');
      // NEW: update streak + diary
      const result = await streak.onSessionComplete({ 
        coachName: coach.name, 
        className: getClassDisplayName() 
      });
      console.log('✅ Streak update result:', result);

      await cleanupSession();
      router.back();
    } catch (error) {
      console.error('❌ Error finishing session:', error);
      await cleanupSession();
      router.back();
    }
  };

  const cleanupSession = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop TrackPlayer if it's running
    if (isTrackPlayerReady && TrackPlayerDirect) {
      try {
        await TrackPlayerDirect.stop();
        await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'stopped');
        console.log('🛑 TrackPlayer stopped during cleanup');
      } catch (error) {
        console.warn('Failed to stop TrackPlayer during cleanup:', error);
      }
    }
    
    // Reset session state
    setIsPlaying(false);
    setIsInitializing(false);
    sessionEndTime.current = 0;
  };

  // Play/Pause toggle
  const togglePlay = async () => {
    console.log('🎮 Toggle play pressed, hasAudio:', hasAudio, 'isPlaying:', isPlaying);
    
    // Prevent multiple rapid clicks while initializing
    if (isInitializing) {
      console.log('🎮 Session is already initializing, please wait...');
      return;
    }
    
    // If session not initialized yet, start it first
    if (!sessionEndTime.current || sessionEndTime.current <= Date.now()) {
      console.log('🎮 Session not initialized yet, starting session first...');
      setIsInitializing(true);
      try {
        await startSession();
        console.log('🎮 Session started, audio should now be playing');
      } catch (error) {
        console.error('❌ Failed to initialize session:', error);
      } finally {
        setIsInitializing(false);
      }
      return;
    }
    
    // Fallback if no audio (Expo Go): Toggle timer
    if (!hasAudio) {
      if (isPlaying) {
        setIsPlaying(false);
        pauseTimer();
        console.log('⏸️ Timer paused (no TrackPlayer)');
      } else {
        setIsPlaying(true);
        resumeTimer();
        console.log('▶️ Timer playing (no TrackPlayer)');
      }
      return;
    }
    
    if (isTrackPlayerReady && TrackPlayerDirect) {
      try {
        const state = await TrackPlayerDirect.getState();
        console.log('🎵 TrackPlayer state:', state);
        if (state === TrackPlayerState.Playing) {
          await TrackPlayerDirect.pause();
          setIsPlaying(false);
          pauseTimer();
          console.log('⏸️ TrackPlayer paused');
        } else {
          await TrackPlayerDirect.play();
          setIsPlaying(true);
          resumeTimer();
          console.log('▶️ TrackPlayer playing');
        }
      } catch (error) {
        console.warn('Failed to toggle play/pause:', error);
        // Fallback: just toggle the timer (audio won't play but timer will work)
        if (isPlaying) {
          setIsPlaying(false);
          pauseTimer();
          console.log('⏸️ Timer paused (TrackPlayer fallback)');
        } else {
          setIsPlaying(true);
          resumeTimer();
          console.log('▶️ Timer playing (TrackPlayer fallback)');
        }
      }
    } else {
        // Fallback catch-all
        if (isPlaying) {
            setIsPlaying(false);
            pauseTimer();
        } else {
            setIsPlaying(true);
            resumeTimer();
        }
    }
  };

  // Back early handler
  const goBackEarly = async () => {
    // Analytics tracking for separate stream
    track('session_abandoned', {
      coach_id: coach.id,
      class_id: cls.id,
    }).catch(() => {});
    
    await cleanupSession();
    router.back();
  };

  // Display logic: If audio exists, use audio progress. If not, use timer progress.
  const displayPosition = hasAudio ? audioPosition : position;
  const displayDuration = hasAudio ? audioDuration : (timerSeconds * 60_000);
  const progress = displayDuration > 0 ? displayPosition / displayDuration : 0;

  const fmt = (ms:number) => {
    const s=Math.floor(ms/1000), m=Math.floor(s/60), sec=s%60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  // Timer management functions
  const startTimer = () => {
    console.log('⏰ Starting timer for', timerSeconds, 'minutes');
    
    // Safety check: ensure session is properly initialized
    if (!sessionEndTime.current || sessionEndTime.current <= Date.now()) {
      console.warn('⚠️ Cannot start timer - session not properly initialized');
      return;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, sessionEndTime.current - Date.now());
      // sessionProgress increases from 0 to duration
      const sessionProgress = (timerSeconds * 60_000) - rem;
      
      // Update fallback position state
      setPosition(sessionProgress);
      
      // Debug timer progress
      if (Math.floor(rem / 1000) % 10 === 0) { // Log every 10 seconds
        console.log('⏱️ Timer remaining:', Math.floor(rem / 1000), 'seconds');
      }
      
      if (rem <= 0) {
        console.log('🎯 Timer finished - calling finishSession');
        finishSession();
      }
    }, 500); // update every 500ms
    console.log('✅ Timer started successfully');
  };

  const pauseTimer = () => {
    console.log('⏸️ Pausing timer');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pausedAtTime.current = Date.now();
  };

  const resumeTimer = () => {
    console.log('▶️ Resuming timer');
    
    // Safety check: ensure session is properly initialized
    if (!sessionEndTime.current || sessionEndTime.current <= Date.now()) {
      console.warn('⚠️ Cannot resume timer - session not properly initialized');
      return;
    }
    
    const pauseDuration = Date.now() - pausedAtTime.current;
    sessionEndTime.current += pauseDuration;
    startTimer();
  };

  // Seek functionality
  const seekTo = async (seekPercentage: number) => {
    if (!hasAudio || !audioDuration || !isTrackPlayerReady || !TrackPlayerDirect) return;
    
    try {
      const seekTime = (seekPercentage / 100) * audioDuration;
      await TrackPlayerDirect.seekTo(seekTime / 1000); // Convert milliseconds to seconds
      // Don't update session position - that should continue based on real time
    } catch (error) {
      console.warn('Failed to seek audio:', error);
    }
  };

  const onProgressBarPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const seekPercentage = (locationX / progressBarWidth) * 100;
    seekTo(Math.max(0, Math.min(100, seekPercentage)));
  };

  // Simple swipe down gesture handler for Expo Go compatibility
  const swipeDownGestureHandler = (event: any) => {
    const { translationY, state } = event.nativeEvent;
    
    if (state === State.END) {
      console.log('🔄 Gesture ended, translationY:', translationY);
      // If user swiped down more than 50px, close the overlay
      if (translationY > 50) {
        console.log('🔄 Closing overlay via swipe');
        goBackEarly();
      }
    }
  };

  // Fallback PanResponder for better Expo Go compatibility
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to vertical swipes
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      console.log('🔄 PanResponder move:', gestureState.dy);
    },
    onPanResponderRelease: (evt, gestureState) => {
      console.log('🔄 PanResponder release, dy:', gestureState.dy);
      // If user swiped down more than 50px, close the overlay
      if (gestureState.dy > 50) {
        console.log('🔄 Closing overlay via PanResponder swipe');
        goBackEarly();
      }
    },
  });

  return (
    <PanGestureHandler onGestureEvent={swipeDownGestureHandler}>
      <View style={styles.rootContainer} {...panResponder.panHandlers}>
        {/* fallback solid bg */}
        <View style={styles.fallback} />

        {/* Cached + manual fade BG */}
        <ScreenBackground source={require('../../assets/images/THETA-BG.png')} />

        <SafeAreaView style={styles.container}>
        {/* DEBUG BANNER - Only shows in development */}
        {__DEV__ && (
          <View style={{backgroundColor: hasAudio ? '#4CAF50' : '#FF5722', padding: 6, borderRadius: 6, marginHorizontal: 20, marginBottom: 4}}>
            <Text style={{color: 'white', fontSize: 10, textAlign: 'center'}}>
              {hasAudio ? '✅ Audio Mode' : '⏱️ Timer Only'} | TP: {isTrackPlayerReady ? '✓' : '✗'} | URL: {audioUrl ? '✓' : '✗'}
            </Text>
          </View>
        )}
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            console.log('🔄 Arrow pressed - closing overlay');
            goBackEarly();
          }}>
            <ArrowDown color="white" size={24}/>
          </TouchableOpacity>
          <Text style={styles.title}>Sleep Session</Text>
          <View style={{width:24}}/>
        </View>

        {/* PROFILE SECTION */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <ExpoImage 
              source={{ uri: coach.image_url || 'https://via.placeholder.com/200x200' }}
              contentFit="cover"
              transition={0}
              cachePolicy="disk"
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
            onPress={() => {
              console.log('🎮 Play button pressed - calling togglePlay');
              togglePlay();
            }}
            disabled={!hasAudio && isInitializing}
            style={(isInitializing) && styles.playButtonDisabled}
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
                {isInitializing ? (
                  <Clock size={32} color="white" />
                ) : isPlaying ? (
                  <ExpoImage 
                  source={require('../../assets/images/pause-icon.png')}
                  style={styles.playIcon}
                />
                ) : (
                  <ExpoImage 
                    source={require('../../assets/images/play-btn-icon.png')}
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
          <Text style={styles.timeText}>{fmt(displayPosition)}</Text>
          <Text style={styles.fullText}>{fmt(displayDuration)}</Text>
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
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000', // Ensure consistent background
  },
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
