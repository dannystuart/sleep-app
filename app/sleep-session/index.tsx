import React, { useEffect, useRef, useState } from 'react';
import {
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
import { getEventConstant, getStateConstant, isTrackPlayerSupported, getDetectionLog } from '../../lib/audio/trackPlayerSafe';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useApp } from '../../contexts/AppContext';
import { Clock, ArrowDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { track } from '../../lib/analytics';
import { PLAYER_STATE_STORAGE_KEY } from '../../lib/audio/constants';
import { isSleepSessionActive, clearSessionStoppedFlag } from '../../lib/audio/player';
import { useKeepAwake } from 'expo-keep-awake';

// Try direct import first, fall back to safe wrapper
let TrackPlayerDirect: any = null;
let TrackPlayerEventDirect: any = null;
let TrackPlayerStateDirect: any = null;
let directLoadError: string | null = null;

// Helper to resolve TrackPlayer regardless of export shape
const resolveTrackPlayerDirect = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rntp = require('react-native-track-player');
    const candidates = [
      (rntp as any)?.TrackPlayer,
      (rntp as any)?.default?.TrackPlayer,
      rntp?.default,
      rntp,
    ];
    for (const cand of candidates) {
      if (cand && typeof cand.getState === 'function') {
        return { tp: cand, State: rntp.State || cand.State };
      }
    }
  } catch (e) {
    console.log('resolveTrackPlayerDirect error:', e);
  }
  return { tp: null, State: null };
};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rntp = require('react-native-track-player');
  // Try different ways to access TrackPlayer
  if (typeof rntp.setupPlayer === 'function') {
    TrackPlayerDirect = rntp;
    console.log('🔍 Using TrackPlayer from root export');
  } else if (rntp.default && typeof rntp.default.setupPlayer === 'function') {
    TrackPlayerDirect = rntp.default;
    console.log('🔍 Using TrackPlayer from default export');
  } else {
    throw new Error('TrackPlayer methods not found on any export');
  }
  // Event and State are named exports, not properties of default
  TrackPlayerEventDirect = rntp.Event;
  TrackPlayerStateDirect = rntp.State;
  console.log('✅ Direct TrackPlayer import successful, Event:', !!TrackPlayerEventDirect, 'State:', !!TrackPlayerStateDirect, 'Methods:', !!TrackPlayerDirect.play, !!TrackPlayerDirect.stop);
} catch (e: any) {
  directLoadError = e?.message || 'Unknown error';
  console.log('ℹ️ Direct TrackPlayer import failed:', directLoadError);
}

export default function SleepSessionScreen() {
  // ========== ALL HOOKS MUST BE DECLARED FIRST (before any early returns) ==========
  useKeepAwake(); // Keep screen on while session is active
  const router = useRouter();
  const params = useLocalSearchParams();
  const { coaches, classes, sessionAudio, selectedCoachId, selectedClassId, timerSeconds, logEvent, isLoading, streak } = useApp();
  const coach = coaches.find(c => c.id === selectedCoachId);
  const cls = classes.find(c => c.id === selectedClassId);
  
  // Get the audio URL for this coach+class combination
  const sessionAudioEntry = sessionAudio.find(
    sa => sa.coach_id === selectedCoachId && sa.class_id === selectedClassId
  );
  const audioUrl = sessionAudioEntry?.audio_url;
  
  // State declarations - ALL must come before any returns
  const [isFinishing, setIsFinishing] = useState(false);
  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(300);
  
  // Ref declarations - ALL must come before any returns
  const isMountedRef = useRef(true);
  const hasLoggedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const sessionEndTime = useRef<number>(0);
  const pausedAtTime = useRef<number>(0);
  const progressBarRef = useRef<View>(null);

  // Check if TrackPlayer is available (not in Expo Go)
  const TrackPlayerEvent = TrackPlayerEventDirect || getEventConstant();
  const TrackPlayerState = TrackPlayerStateDirect || getStateConstant();
  const isTrackPlayerReady = (!!TrackPlayerDirect || isTrackPlayerSupported()) && TrackPlayerEvent && TrackPlayerState;

  // Check if audio is available for this combination
  const hasAudio = audioUrl && !audioUrl.includes('example.com') && isTrackPlayerReady;

  // ========== ALL useEffect HOOKS MUST BE DECLARED BEFORE ANY RETURNS ==========

  // One-time debug logging on mount
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
  }, [hasAudio, audioUrl, isTrackPlayerReady]);

  // Track mounted state for safe navigation
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Defer session setup until after nav animation
  useEffect(() => {
    // Guard: don't run if data not ready
    if (isLoading || !coach || !cls) return;

    const task = InteractionManager.runAfterInteractions(async () => {
      // If resumed from mini player, do not restart session if already active
      const resume = params?.resume === '1';
      if (resume) {
        try {
          // If the timer already expired while backgrounded, finish the session
          const timerExpired = await AsyncStorage.getItem('theta_session_timer_expired');
          const storedEndTime = await AsyncStorage.getItem('theta_sleep_end_ts');
          const endMs = storedEndTime ? parseInt(storedEndTime, 10) : NaN;
          if (timerExpired === 'true' || (!Number.isNaN(endMs) && Date.now() >= endMs)) {
            console.log('⏰ Resume requested but timer already expired - completing session');
            setTimeout(() => {
              if (isMountedRef.current) {
                handleFinishSession();
              }
            }, 100);
            return;
          }

          const active = await isSleepSessionActive();
          if (active) {
            console.log('🔄 Resuming active session...');
            
            // 1. Sync playing state and position
            let isPlayerPlaying = true;
            let currentPos = 0;
            try {
               const { tp, State } = resolveTrackPlayerDirect();
               if (tp) {
                 const state = await tp.getState();
                 isPlayerPlaying = state === State?.Playing;
                 currentPos = await tp.getPosition();
               }
            } catch (e) {
                console.warn('Error syncing state on resume:', e);
            }
            setIsPlaying(isPlayerPlaying);
            
            // 2. Recalculate end time based on position (most reliable)
            // This handles cases where storage was lost or time drifted while paused
            const totalSeconds = timerSeconds * 60;
            // Ensure at least 1s left so we don't restart or finish immediately
            const remainingSeconds = Math.max(1, totalSeconds - currentPos); 
            
            sessionEndTime.current = Date.now() + remainingSeconds * 1000;
            await persistSessionEndTime(sessionEndTime.current);
            
            if (isPlayerPlaying) {
                 console.log('🔄 Session is playing, starting timer with remaining:', remainingSeconds);
                 handleStartTimer();
            } else {
                 console.log('🔄 Session is paused, setting paused state with remaining:', remainingSeconds);
                 // We simulate that we just paused right now
                 pausedAtTime.current = Date.now();
            }
            
            return;
          }
        } catch {
          // fall through to start session
        }
      }
      handleStartSession();
    });
    return () => {
      task.cancel?.();
      handleCleanupSession();
    };
  }, [selectedCoachId, selectedClassId, timerSeconds, params?.resume, isLoading, coach, cls]);

  // AppState guard - if app wakes after timer elapsed, end immediately
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        if (isFinishing) {
          console.log('📱 App became active but already finishing session');
          return;
        }
        
        const storedEndTime = await AsyncStorage.getItem('theta_sleep_end_ts');
        if (storedEndTime) {
          const endMs = parseInt(storedEndTime, 10);
          if (!Number.isNaN(endMs) && Date.now() >= endMs) {
            console.log('⏰ Stored timer expired while backgrounded - forcing session end');
            await AsyncStorage.removeItem('theta_sleep_end_ts');
            await AsyncStorage.removeItem('theta_session_timer_expired');
            try {
              const { tp } = resolveTrackPlayerDirect();
              if (tp) await tp.stop();
            } catch {}
            handleFinishSession();
            return;
          }
        }

        const timerExpired = await AsyncStorage.getItem('theta_session_timer_expired');
        if (timerExpired === 'true') {
          console.log('⏰ Timer expired flag detected - completing session');
          await AsyncStorage.removeItem('theta_session_timer_expired');
          try {
            const { tp } = resolveTrackPlayerDirect();
            if (tp) await tp.stop();
          } catch {}
          handleFinishSession();
          return;
        }

        if (hasAudio && isTrackPlayerReady) {
          try {
            const { tp } = resolveTrackPlayerDirect();
            if (!tp) return;
            const trackPlayerState = await tp.getState();
            const isCurrentlyPlaying = trackPlayerState === TrackPlayerState?.Playing;
            console.log('📱 App became active, syncing state:', isCurrentlyPlaying);
            if (isCurrentlyPlaying !== isPlaying) {
              setIsPlaying(isCurrentlyPlaying);
              if (isCurrentlyPlaying) {
                handleResumeTimer();
              } else {
                handlePauseTimer();
              }
            }
          } catch (error) {
            console.warn('Failed to sync state on app active:', error);
          }
        }

        if (sessionEndTime.current && Date.now() >= sessionEndTime.current) {
          try {
            const { tp } = resolveTrackPlayerDirect();
            if (tp) await tp.stop();
          } catch {}
          handleFinishSession();
        }
      }
    });

    let playbackSub: any = null;
    if (isTrackPlayerReady) {
      const { tp } = resolveTrackPlayerDirect();
      playbackSub = tp?.addEventListener?.(
        TrackPlayerEvent?.PlaybackState,
        async ({ state }: { state: any }) => {
        console.log('🎵 Playback state updated (component listener):', state);
        if (state === TrackPlayerState?.Playing) {
          if (!isPlaying) {
            setIsPlaying(true);
            handleResumeTimer();
          }
          await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'playing');
        } else if (state === TrackPlayerState?.Paused || state === TrackPlayerState?.Stopped) {
          if (isPlaying) {
            setIsPlaying(false);
            handlePauseTimer();
          }
          await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'paused');
        }
      });
    }

    return () => {
      sub.remove();
      playbackSub?.remove();
    };
  }, [hasAudio, isPlaying, isFinishing, isTrackPlayerReady]);

  // TrackPlayer audio position tracking and state sync
  useEffect(() => {
    if (!hasAudio || !isTrackPlayerReady || !TrackPlayerDirect) return;
    
    const updatePosition = async () => {
      try {
        const pos = await TrackPlayerDirect.getPosition();
        const dur = await TrackPlayerDirect.getDuration();
        setAudioPosition(pos * 1000);
        setAudioDuration(dur * 1000);
      } catch (error) {
        // Silently ignore - player might not be ready yet
      }
    };
    
    const syncPlaybackState = async () => {
      try {
        const state = await TrackPlayerDirect.getState();
        const isCurrentlyPlaying = state === TrackPlayerState?.Playing;
        
        if (isCurrentlyPlaying !== isPlaying) {
          console.log('🔄 Syncing playback state:', isCurrentlyPlaying);
          setIsPlaying(isCurrentlyPlaying);
          
          if (isCurrentlyPlaying) {
            handleResumeTimer();
          } else {
            handlePauseTimer();
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
  }, [hasAudio, isPlaying, isTrackPlayerReady]);

  // ========== HELPER FUNCTIONS ==========

  const persistSessionEndTime = async (endTime: number) => {
    try {
      await AsyncStorage.setItem('theta_sleep_end_ts', String(endTime));
      await AsyncStorage.removeItem('theta_session_timer_expired');
    } catch (error) {
      console.warn('Failed to persist session end time:', error);
    }
  };

  const getClassDisplayName = () => {
    if (!cls) return 'Select Class';
    if (cls.name.toLowerCase().includes('mixed') || 
        (cls.tags?.includes('Maths') && cls.tags?.includes('Memory') && cls.tags?.includes('Word') && cls.tags?.includes('Facts'))) {
      return 'All Tasks';
    }
    const classDisplayNames: { [key: string]: string } = {
      'Maths': 'Maths',
      'Memory': 'Memory', 
      'Word': 'Word',
      'Facts': 'Facts'
    };
    return classDisplayNames[cls.name] || cls.name || 'Select Class';
  };

  const handleStartSession = async () => {
    if (!coach || !cls) return;
    
    try {
      console.log('🚀 Starting session with timer:', timerSeconds, 'minutes');
      
      await clearSessionStoppedFlag();
      
      await logEvent({ 
        event_type: 'session_start', 
        coach_id: coach.id, 
        class_id: cls.id, 
        timer_seconds: timerSeconds 
      });
      
      track('session_start', {
        coach_id: coach.id,
        class_id: cls.id,
        timer_seconds: timerSeconds,
      }).catch(() => {});
      
      if (!hasAudio) {
        console.warn('🔇 No audio available (or Expo Go mode), running timer-only session');
        sessionEndTime.current = Date.now() + timerSeconds * 60_000;
        console.log('⏰ Timer-only session end time:', new Date(sessionEndTime.current).toLocaleTimeString());
        await persistSessionEndTime(sessionEndTime.current);
        setIsPlaying(true);
        handleStartTimer();
        return;
      }
      
      console.log('🎵 Loading audio:', audioUrl);
      if (isTrackPlayerReady && TrackPlayerDirect) {
        try {
          try {
            await TrackPlayerDirect.getState();
            console.log('✅ TrackPlayer already initialized');
          } catch {
            console.log('🎵 Initializing TrackPlayer...');
            await TrackPlayerDirect.setupPlayer({ waitForBuffer: true });
            console.log('✅ TrackPlayer initialized');
          }
          
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
      
      sessionEndTime.current = Date.now() + timerSeconds * 60_000;
      await persistSessionEndTime(sessionEndTime.current);
      
      console.log('⏰ Session end time set to:', new Date(sessionEndTime.current).toLocaleTimeString());
      handleStartTimer();
      console.log('✅ Session started successfully');
    } catch (error) {
      console.error('❌ Error starting session:', error);
      sessionEndTime.current = Date.now() + timerSeconds * 60_000;
      await persistSessionEndTime(sessionEndTime.current);
      handleStartTimer();
      console.log('✅ Fallback session started (timer only)');
    }
  };

  const handleFinishSession = async () => {
    if (isFinishing) {
      console.log('🎯 finishSession already in progress, skipping');
      return;
    }
    
    console.log('🎯 finishSession called!');
    setIsFinishing(true);
    
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      
      if (coach && cls) {
        // ... logging code ...
      }

      if (isTrackPlayerReady) {
        try {
          const { tp } = resolveTrackPlayerDirect();
          if (tp) {
            await tp.stop();
            await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'stopped');
          }
        } catch (error) {
          console.warn('Failed to stop TrackPlayer:', error);
        }
      }
      setIsPlaying(false);
      await AsyncStorage.removeItem('theta_sleep_end_ts');
      await AsyncStorage.removeItem('theta_session_timer_expired');

      if (coach && cls) {
        console.log('🔥 Updating streak and diary...');
        const result = await streak.onSessionComplete({ 
          coachName: coach.name, 
          className: getClassDisplayName() 
        });
        console.log('✅ Streak update result:', result);
      }

      await handleCleanupSession();
      
      // Delay navigation to ensure the "Session Complete" screen is visible
      // and to allow the navigation system to stabilize after app resume
      console.log('⏳ Waiting before navigation...');
      setTimeout(() => {
        if (isMountedRef.current) {
          console.log('🔄 Navigating back now');
          try {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          } catch (e) {
            console.warn('Navigation failed, forcing to root:', e);
            router.replace('/');
          }
        }
      }, 2000); // 2 second delay for better UX and stability

    } catch (error) {
      console.error('❌ Error finishing session:', error);
      await handleCleanupSession();
      
      // Still navigate even on error, but with delay
      setTimeout(() => {
        if (isMountedRef.current) {
          router.replace('/');
        }
      }, 2000);
    }
  };

  const handleCleanupSession = async () => {
    // Only clear the interval - do NOT stop player or clear storage
    // so that background playback continues
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    console.log('🧹 Session cleanup: cleared timer interval (background play maintained)');
  };

  const handleStartTimer = () => {
    console.log('⏰ Starting timer for', timerSeconds, 'minutes');
    
    if (!sessionEndTime.current || sessionEndTime.current <= Date.now()) {
      console.warn('⚠️ Cannot start timer - session not properly initialized');
      return;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, sessionEndTime.current - Date.now());
      const sessionProgress = (timerSeconds * 60_000) - rem;
      setPosition(sessionProgress);
      
      if (Math.floor(rem / 1000) % 10 === 0) {
        console.log('⏱️ Timer remaining:', Math.floor(rem / 1000), 'seconds');
      }
      
      if (rem <= 0) {
        console.log('🎯 Timer finished - calling finishSession');
        handleFinishSession();
      }
    }, 500);
    console.log('✅ Timer started successfully');
  };

  const handlePauseTimer = () => {
    console.log('⏸️ Pausing timer');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pausedAtTime.current = Date.now();
  };

  const handleResumeTimer = () => {
    console.log('▶️ Resuming timer');
    
    if (!sessionEndTime.current || sessionEndTime.current <= Date.now()) {
      console.warn('⚠️ Cannot resume timer - session not properly initialized');
      return;
    }
    
    const pauseDuration = Date.now() - pausedAtTime.current;
    sessionEndTime.current += pauseDuration;
    void persistSessionEndTime(sessionEndTime.current);
    handleStartTimer();
  };

  const togglePlay = async () => {
    console.log('🎮 Toggle play pressed, hasAudio:', hasAudio, 'isPlaying:', isPlaying);
    
    if (isInitializing) {
      console.log('🎮 Session is already initializing, please wait...');
      return;
    }
    
    if (!sessionEndTime.current || sessionEndTime.current <= Date.now()) {
      console.log('🎮 Session not initialized yet, starting session first...');
      setIsInitializing(true);
      try {
        await handleStartSession();
        console.log('🎮 Session started, audio should now be playing');
      } catch (error) {
        console.error('❌ Failed to initialize session:', error);
      } finally {
        setIsInitializing(false);
      }
      return;
    }
    
    if (!hasAudio) {
      if (isPlaying) {
        setIsPlaying(false);
        handlePauseTimer();
        console.log('⏸️ Timer paused (no TrackPlayer)');
      } else {
        setIsPlaying(true);
        handleResumeTimer();
        console.log('▶️ Timer playing (no TrackPlayer)');
      }
      return;
    }
    
    if (isTrackPlayerReady) {
      try {
        const { tp } = resolveTrackPlayerDirect();
        if (!tp) {
          console.warn('TrackPlayer not resolved for togglePlay');
          return;
        }
        const state = await tp.getState();
        console.log('🎵 TrackPlayer state:', state);
        if (state === TrackPlayerState?.Playing) {
          await tp.pause();
          setIsPlaying(false);
          handlePauseTimer();
          console.log('⏸️ TrackPlayer paused');
        } else {
          await tp.play();
          setIsPlaying(true);
          handleResumeTimer();
          console.log('▶️ TrackPlayer playing');
        }
      } catch (error) {
        console.warn('Failed to toggle play/pause:', error);
        if (isPlaying) {
          setIsPlaying(false);
          handlePauseTimer();
        } else {
          setIsPlaying(true);
          handleResumeTimer();
        }
      }
    } else {
      if (isPlaying) {
        setIsPlaying(false);
        handlePauseTimer();
      } else {
        setIsPlaying(true);
        handleResumeTimer();
      }
    }
  };

  const goBackEarly = async () => {
    if (coach && cls) {
      track('session_abandoned', {
        coach_id: coach.id,
        class_id: cls.id,
      }).catch(() => {});
    }
    
    await handleCleanupSession();
    router.back();
  };

  const seekTo = async (seekPercentage: number) => {
    if (!hasAudio || !audioDuration || !isTrackPlayerReady || !TrackPlayerDirect) return;
    
    try {
      const seekTime = (seekPercentage / 100) * audioDuration;
      await TrackPlayerDirect.seekTo(seekTime / 1000);
    } catch (error) {
      console.warn('Failed to seek audio:', error);
    }
  };

  const onProgressBarPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const seekPercentage = (locationX / progressBarWidth) * 100;
    seekTo(Math.max(0, Math.min(100, seekPercentage)));
  };

  const swipeDownGestureHandler = (event: any) => {
    const { translationY, state } = event.nativeEvent;
    
    if (state === State.END) {
      console.log('🔄 Gesture ended, translationY:', translationY);
      if (translationY > 50) {
        console.log('🔄 Closing overlay via swipe');
        goBackEarly();
      }
    }
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      console.log('🔄 PanResponder move:', gestureState.dy);
    },
    onPanResponderRelease: (evt, gestureState) => {
      console.log('🔄 PanResponder release, dy:', gestureState.dy);
      if (gestureState.dy > 50) {
        console.log('🔄 Closing overlay via PanResponder swipe');
        goBackEarly();
      }
    },
  });

  // Display logic
  const displayPosition = hasAudio ? audioPosition : position;
  const displayDuration = hasAudio ? audioDuration : (timerSeconds * 60_000);
  const progress = displayDuration > 0 ? displayPosition / displayDuration : 0;

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ========== NOW SAFE TO DO EARLY RETURNS (after all hooks) ==========

  // Early return if data is not ready or selections are invalid
  if (isLoading || !coach || !cls) {
    return (
      <View style={{flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: 'white', fontSize: 18, fontFamily: 'DMSans'}}>Loading session...</Text>
      </View>
    );
  }

  // Show a completion state when session is finishing (prevents black screen)
  if (isFinishing) {
    return (
      <View style={{flex: 1, backgroundColor: '#15131A', justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: 'white', fontSize: 20, fontFamily: 'DMSans', marginBottom: 8}}>Session Complete!</Text>
        <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 16, fontFamily: 'DMSans'}}>Great job! 🎉</Text>
      </View>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <PanGestureHandler onGestureEvent={swipeDownGestureHandler}>
      <View style={styles.rootContainer} {...panResponder.panHandlers}>
        <View style={styles.fallback} />
        <ScreenBackground source={require('../../assets/images/THETA-BG.png')} />

        <SafeAreaView style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              console.log('🔄 Arrow pressed - closing overlay');
              goBackEarly();
            }}>
              <ArrowDown color="white" size={24}/>
            </TouchableOpacity>
            <Text style={styles.title}>Sleep Session</Text>
            <View style={{width: 24}}/>
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
              style={isInitializing ? styles.playButtonDisabled : undefined}
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
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </TouchableOpacity>
            <View style={styles.progressTimer}>
              <Text style={styles.timeText}>{fmt(displayPosition)}</Text>
              <Text style={styles.fullText}>{fmt(displayDuration)}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000',
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
});
