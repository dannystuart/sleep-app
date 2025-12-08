import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Pause, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLAYER_STATE_STORAGE_KEY } from '../lib/audio/constants';
import { stopSleepSession, isSleepSessionActive } from '../lib/audio/player';

// Try to import TrackPlayer directly
let TrackPlayer: any = null;
let TrackPlayerState: any = null;

try {
  const rntp = require('react-native-track-player');
  // Try different ways to access TrackPlayer
  if (typeof rntp.getState === 'function') {
    TrackPlayer = rntp;
  } else if (rntp.default && typeof rntp.default.getState === 'function') {
    TrackPlayer = rntp.default;
  }
  TrackPlayerState = rntp.State;
} catch {
  // TrackPlayer not available
}

interface MiniPlayerProps {
  coachName?: string;
  className?: string;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ coachName, className }) => {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [manualHide, setManualHide] = useState(false);
  const slideAnim = useState(new Animated.Value(100))[0];

  // Check if there's an active session
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const active = await isSleepSessionActive();
        if (!active) {
          setManualHide(false);
        }

        const shouldShow = active && !manualHide;

        if (shouldShow) {
          setIsVisible(true);
          // If TrackPlayer is available, sync play state; otherwise default to playing
          if (TrackPlayer) {
            try {
              const state = await TrackPlayer.getState();
              setIsPlaying(state === TrackPlayerState?.Playing);
            } catch {
              setIsPlaying(true);
            }
          } else {
            setIsPlaying(true);
          }
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        } else {
          Animated.timing(slideAnim, {
            toValue: 100,
            duration: 200,
            useNativeDriver: true,
          }).start(() => setIsVisible(false));
        }
      } catch (error) {
        // Player not initialized
        setIsVisible(false);
      }
    };

    checkActiveSession();
    
    // Poll for state changes
    const interval = setInterval(checkActiveSession, 1000);
    
    // Also listen to playback state events if available
    let subscription: any = null;
    if (TrackPlayer && TrackPlayerState) {
      try {
        const rntp = require('react-native-track-player');
        subscription = TrackPlayer.addEventListener(
          rntp.Event.PlaybackState,
          ({ state }: { state: any }) => {
            const hasActiveTrack = state !== TrackPlayerState?.None && state !== TrackPlayerState?.Stopped;
            if (hasActiveTrack) {
              setIsVisible(true);
              setIsPlaying(state === TrackPlayerState?.Playing);
              Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 10,
              }).start();
            } else {
              Animated.timing(slideAnim, {
                toValue: 100,
                duration: 200,
                useNativeDriver: true,
              }).start(() => setIsVisible(false));
            }
          }
        );
      } catch {}
    }
    
    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, []);

  const togglePlayPause = async () => {
    if (!TrackPlayer) return;
    
    try {
      const state = await TrackPlayer.getState();
      if (state === TrackPlayerState?.Playing) {
        await TrackPlayer.pause();
        setIsPlaying(false);
        await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'paused');
      } else {
        await TrackPlayer.play();
        setIsPlaying(true);
        await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'playing');
      }
    } catch (error) {
      console.warn('Failed to toggle play/pause:', error);
    }
  };

  const stopSession = async () => {
    try {
      setManualHide(true); // prevent pop-back while stopping
      await stopSleepSession();
      setIsPlaying(false);
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setIsVisible(false));
    } catch (error) {
      console.warn('Failed to stop session:', error);
    }
  };

  const openSession = () => {
    // Resume existing session; do not restart it
    router.push('/sleep-session?resume=1');
  };

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <LinearGradient
        colors={['rgba(121, 75, 214, 0.95)', 'rgba(88, 94, 210, 0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <TouchableOpacity style={styles.contentArea} onPress={openSession} activeOpacity={0.8}>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {coachName || 'Sleep Session'}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {className || 'Now Playing'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.controls}>
          <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
            {isPlaying ? (
              <Pause size={24} color="white" fill="white" />
            ) : (
              <Play size={24} color="white" fill="white" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={stopSession} style={styles.stopButton}>
            <X size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, // Raised above the tab bar
    left: 12,
    right: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contentArea: {
    flex: 1,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DMSans',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'DMSans',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MiniPlayer;

