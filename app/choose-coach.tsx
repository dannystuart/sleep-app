import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../components/SafeAreaView';
import { useApp } from '../contexts/AppContext';
import { ChevronLeft, Play, Square } from 'lucide-react-native';
import { track } from '../lib/analytics';
import { Audio } from 'expo-av';
import { stopSleepSession } from '../lib/audio/player';

const { width } = Dimensions.get('window');
const maxWidth = Math.min(width, 400);

export default function ChooseCoachScreen() {
  const router = useRouter();
  const { coaches, selectedCoachId, setCoach, streak } = useApp();
  const [tempSelectedCoachId, setTempSelectedCoachId] = useState(selectedCoachId);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [playingCoachId, setPlayingCoachId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await streak.getState?.();
        if (alive) setBestStreak(s?.best ?? 0);
      } catch (err) {
        console.warn('Failed to load best streak', err);
        if (alive) setBestStreak(0);
      }
    })();
    return () => { alive = false; };
  }, [streak]);

  // treat null/undefined as 0 to keep old rows visible at start
  const unlockedCoaches = useMemo(
    () => (coaches ?? []).filter(c => (c.unlock_streak ?? 0) <= bestStreak),
    [coaches, bestStreak]
  );

  useEffect(() => {
    if (!unlockedCoaches?.length) return;
    const stillVisible = unlockedCoaches.some(c => c.id === tempSelectedCoachId);
    if (!stillVisible) {
      setTempSelectedCoachId(unlockedCoaches[0].id);
    }
  }, [unlockedCoaches, tempSelectedCoachId]);

  // Set audio mode on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeIOS: 1, // DoNotMix - interrupts other audio
      interruptionModeAndroid: 1, // DoNotMix
    }).catch(err => console.warn('Failed to set audio mode:', err));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Check if a URL is accessible
  const checkUrlAccessible = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  const stopPlayback = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {
      console.log('Error stopping audio:', e);
    } finally {
      setPlayingCoachId(null);
    }
  };

  const playSound = async (uri: string, coachId: string, isRetry = false) => {
    try {
      // Stop any active sleep session before playing sample
      await stopSleepSession();
      
      // Stop any currently playing audio
      await stopPlayback();
      
      // Set playing state immediately
      setPlayingCoachId(coachId);
      
      // Ensure audio mode is set to interrupt other audio
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
      
      if (!status.isLoaded) {
        throw new Error('Sound failed to load');
      }
      
      soundRef.current = sound;
      console.log('🎵 Audio playing successfully!');
      
      // Listen for playback to finish naturally instead of timeout
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          stopPlayback();
        }
      });
      
    } catch (error) {
      if (!isRetry) {
        console.warn('🎵 Primary URL issue, trying fallback...');
        // Try fallback URL
        const fallbackUrl = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg';
        try {
          await playSound(fallbackUrl, coachId, true);
        } catch {
          setPlayingCoachId(null);
        }
      } else {
        console.error('🎵 All audio sources failed');
        setPlayingCoachId(null);
      }
    }
  };

  const handlePlaySample = async (coach: any) => {
    // If this coach is already playing, stop it
    if (playingCoachId === coach.id) {
      await stopPlayback();
      return;
    }
    
    const uri = coach.sample_audio || coach.audio_url || coach.preview_url;
    if (!uri) {
      console.warn('No sample audio URL for coach:', coach.name);
      // Play fallback
      await playSound('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg', coach.id, true);
      return;
    }
    
    await playSound(uri, coach.id);
  };

  const handleCoachSelect = (coachId: string) => {
    setTempSelectedCoachId(coachId);
    track('select_coach', { coach_id: coachId }).catch(() => {});
  };

  const handleBackPress = async () => {
    // Stop any playing audio when leaving
    await stopPlayback();
    if (unlockedCoaches.length > 0 && tempSelectedCoachId !== selectedCoachId) {
      await setCoach(tempSelectedCoachId);
    }
    router.back();
  };

  const renderCoach = ({ item }: { item: any }) => {
    const isPlaying = playingCoachId === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.coachCard,
          item.id === tempSelectedCoachId && styles.selectedCoachCard
        ]}
        onPress={() => handleCoachSelect(item.id)}
        activeOpacity={0.8}
      >
        <Image 
          source={{ uri: item.image_url }} 
          style={styles.coachImage}
          contentFit="cover"
          transition={0}
          cachePolicy="disk"
        />
        <View style={styles.coachInfo}>
          <Text style={styles.coachName}>{item.name}</Text>
          {item.locale && item.style && (
            <Text style={styles.coachDetails}>{item.locale}, {item.style}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.playButton, isPlaying && styles.playButtonActive]}
          onPress={() => handlePlaySample(item)}
          activeOpacity={0.7}
        >
          {isPlaying ? (
            <Square color="white" size={16} fill="white" />
          ) : (
            <Play color="white" size={16} fill="white" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.container}>
        <View style={[styles.mobileContainer, { maxWidth }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Choose Coach</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Coaches List */}
          <FlatList
            data={unlockedCoaches}
            renderItem={renderCoach}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ paddingTop: 24, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                  No coaches unlocked yet.
                </Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#15131A', // Solid dark background
  },
  container: {
    flex: 1,
    backgroundColor: '#15131A', // Ensure container also has background
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
  placeholder: {
    width: 40,
  },
  listContainer: {
    paddingBottom: 20,
  },
  coachCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCoachCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  coachImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 4,
    fontFamily: 'DMSans',
  },
  coachDetails: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(121, 75, 214, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  playButtonActive: {
    backgroundColor: 'rgba(246, 145, 151, 0.7)',
  },
}); 