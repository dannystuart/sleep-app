// TrackPlayer setup with Expo Go fallback
import { 
  TrackPlayer, 
  isTrackPlayerSupported,
} from './trackPlayerSafe';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLAYER_STATE_STORAGE_KEY } from './constants';

// Minimal helpers to grab the module regardless of export shape
const getTPModule = () => {
  const m = require('react-native-track-player');
  return (m as any).default ?? m;
};

const getTPConst = <T = any>(key: string): T | null => {
  try {
    const m = require('react-native-track-player');
    return (m as any)[key] ?? null;
  } catch {
    return null;
  }
};

export async function setupPlayerOnce() {
  if (!isTrackPlayerSupported()) {
    console.warn('TrackPlayer not available (Expo Go mode) - skipping setup');
    return;
  }

  // Check if player is already initialized by trying to get state
  try {
    const tp = getTPModule();
    if (typeof tp?.getState !== 'function') throw new Error('getState missing');
    const state = await tp.getState();
    console.log('✅ TrackPlayer already initialized, state:', state);
    return; // Player is already set up
  } catch (error: any) {
    // Player not initialized yet - this is expected on first run
    console.log('🎵 TrackPlayer needs initialization...');
  }

  try {
    const tp = getTPModule();
    if (typeof tp?.setupPlayer !== 'function') {
      throw new Error('TrackPlayer.setupPlayer not found');
    }
    
    console.log('🎵 Calling TrackPlayer.setupPlayer...');
    await tp.setupPlayer({
      waitForBuffer: true,
      // iOS audio session configuration - this makes it appear in Control Center
      // and properly interrupt other audio
      ...(() => {
        const IOSCategory = getTPConst('IOSCategory');
        const IOSCategoryMode = getTPConst('IOSCategoryMode');
        if (IOSCategory) {
          return {
            iosCategory: IOSCategory.Playback,
            iosCategoryMode: IOSCategoryMode?.SpokenAudio,
          };
        }
        return {};
      })(),
    });
    console.log('✅ TrackPlayer.setupPlayer completed');

    // Only update options if we have the Capability constants
    const Capability = getTPConst('Capability');
    const AppKilledPlaybackBehavior = getTPConst('AppKilledPlaybackBehavior');
    if (Capability) {
      console.log('🎵 Updating TrackPlayer options...');
      await tp.updateOptions({
        // Show lock-screen / notification controls
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
        progressUpdateEventInterval: 1,
        android: AppKilledPlaybackBehavior ? {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        } : undefined,
      });
      console.log('✅ TrackPlayer options updated');
    }
  } catch (error) {
    console.warn('❌ Failed to setup TrackPlayer:', error);
  }
}

// Key to mark session as explicitly stopped by user
const SESSION_STOPPED_KEY = 'theta_session_stopped';

/**
 * Stop the current sleep session if one is playing.
 * Call this before playing other audio (like coach samples).
 */
export async function stopSleepSession(): Promise<void> {
  if (!isTrackPlayerSupported()) {
    return;
  }
  
  try {
    const tp = getTPModule();
    if (!tp) {
      console.warn('TrackPlayer module not resolved in stopSleepSession');
      return;
    }

    console.log('🛑 Force stopping sleep session');
    
    // Stop/pause and reset regardless of current state
    try {
      if (typeof tp.pause === 'function') {
        await tp.pause();
      }
    } catch {}
    
    try {
      if (typeof tp.stop === 'function') {
        await tp.stop();
      }
    } catch {}
    
    try {
      if (typeof tp.reset === 'function') {
        await tp.reset();
      }
    } catch {}
    
    // Mark session as explicitly stopped
    await AsyncStorage.setItem(SESSION_STOPPED_KEY, 'true');
    await AsyncStorage.removeItem('theta_sleep_end_ts');
    await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'stopped');
    
    console.log('✅ Sleep session stopped and marked as stopped');
  } catch (error) {
    console.warn('Failed to stop sleep session:', error);
  }
}

/**
 * Clear the stopped flag when starting a new session
 */
export async function clearSessionStoppedFlag(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_STOPPED_KEY);
}

/**
 * Check if session was explicitly stopped by user
 */
export async function wasSessionExplicitlyStopped(): Promise<boolean> {
  const stopped = await AsyncStorage.getItem(SESSION_STOPPED_KEY);
  return stopped === 'true';
}

/**
 * Check if a sleep session is currently active/playing.
 * Returns false if user explicitly stopped the session.
 */
export async function isSleepSessionActive(): Promise<boolean> {
  if (!isTrackPlayerSupported()) {
    return false;
  }
  
  try {
    // If user explicitly stopped, always return false
    const explicitlyStopped = await wasSessionExplicitlyStopped();
    if (explicitlyStopped) {
      return false;
    }
    
    const tp = getTPModule();
    if (!tp) return false;
    const State = getTPConst('State');
    
    const state = typeof tp.getState === 'function' ? await tp.getState() : null;
    return state !== State?.None && state !== State?.Stopped;
  } catch {
    return false;
  }
}
