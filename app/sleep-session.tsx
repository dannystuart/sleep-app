import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  InteractionManager,
  ImageBackground,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../components/SafeAreaView';
import { useApp } from '../contexts/AppContext';
import { ChevronLeft, Play, Pause, SkipBack } from 'lucide-react-native';

export default function SleepSessionScreen() {
  const router = useRouter();
  const { coaches, classes, sessionAudio, selectedCoachId, selectedClassId, timerSeconds, logEvent, isLoading } = useApp();
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
        <Text style={{color: 'white', fontSize: 18}}>Loading session...</Text>
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
      // 1. Analytics
      await logEvent({ 
        event_type: 'session_start', 
        coach_id: coach.id, 
        class_id: cls.id, 
        timer_seconds: timerSeconds 
      });
      
      // 2. Configure audio mode
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
      
      // 3. Check if audio URL is valid
      if (!hasAudio) {
        console.warn('No audio available for this coach+class combination, running timer-only session');
        // Start timer without audio
        sessionEndTime.current = Date.now() + timerSeconds * 60_000;
        startTimer();
        return;
      }
      
      // 4. Load & play the single MP3
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onPlaybackStatus);
      setIsPlaying(true);
      
      // 5. Start countdown timer
      sessionEndTime.current = Date.now() + timerSeconds * 60_000;
      startTimer();
    } catch (error) {
      console.error('Error starting session:', error);
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
    try {
      clearInterval(timerRef.current!);
      await logEvent({ 
        event_type: 'session_complete', 
        coach_id: coach.id, 
        class_id: cls.id, 
        timer_seconds: timerSeconds 
      });
      cleanupSession();
      router.back();
    } catch (error) {
      console.error('Error finishing session:', error);
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, sessionEndTime.current - Date.now());
      const sessionProgress = timerSeconds * 60_000 - rem;
      setPosition(sessionProgress);
      if (rem <= 0) finishSession();
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

        {/* INFO */}
        <View style={styles.info}>
          <Text style={styles.infoText}>{coach.name} • {getClassDisplayName()}</Text>
          <Text style={styles.duration}>{timerSeconds} min</Text>
          {!hasAudio && (
            <Text style={styles.noAudioText}>Timer only - no audio available</Text>
          )}
        </View>

        {/* PROGRESS */}
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
        <Text style={styles.timeText}>{fmt(audioPosition)} / {fmt(length)}</Text>

        {/* CONTROLS */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.ctrlBtn}><SkipBack color="white" size={24}/></TouchableOpacity>
          <TouchableOpacity 
            style={[styles.playBtn, (!hasAudio || !soundRef.current) && styles.playBtnDisabled]} 
            onPress={togglePlay}
            disabled={!hasAudio || !soundRef.current}
          >
            {isPlaying ? <Pause color="white" size={32}/> : <Play color="white" size={32}/>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn}>
            <SkipBack color="white" size={24} style={{transform:[{scaleX:-1}]}}/>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  container: {flex:1, paddingHorizontal:20},
  header: {flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:16, marginBottom:40},
  title: {color:'white', fontSize:20, fontWeight:'300'},
  info: {alignItems:'center', marginBottom:60},
  infoText: {color:'white', fontSize:24},
  duration: {color:'rgba(255,255,255,0.7)', fontSize:16, marginTop:4},
  noAudioText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
  },
  progressBarContainer: {
    alignItems: 'center',
    marginVertical: 16,
    paddingVertical: 8, // Add padding for better touch target
  },
  progressBar: {
    height: 12, // Slightly taller for better touch target
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 6, 
    overflow: 'hidden', 
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%', 
    backgroundColor: '#F99393', 
    borderRadius: 6,
  },
  progressBarDisabled: {
    opacity: 0.5,
  },
  timeText:{color:'white', textAlign:'center', marginBottom:60},
  controls:{flexDirection:'row', justifyContent:'center', alignItems:'center', gap:40},
  ctrlBtn:{width:48, height:48, borderRadius:24, backgroundColor:'rgba(255,255,255,0.1)', alignItems:'center', justifyContent:'center'},
  playBtn:{width:80, height:80, borderRadius:40, backgroundColor:'#F99393', alignItems:'center', justifyContent:'center'},
  playBtnDisabled: {
    opacity: 0.5,
  },
}); 