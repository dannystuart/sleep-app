// TrackPlayer setup with Expo Go fallback
import { 
  TrackPlayer, 
  isTrackPlayerSupported,
  safeTrackPlayerCall 
} from './trackPlayerSafe';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLAYER_STATE_STORAGE_KEY } from './constants';

// Get Capability, AppKilledPlaybackBehavior, and IOSCategory directly from the module
let Capability: any = null;
let AppKilledPlaybackBehavior: any = null;
let IOSCategory: any = null;
let IOSCategoryMode: any = null;
let IOSCategoryOptions: any = null;

try {
  const rntp = require('react-native-track-player');
  Capability = rntp.Capability;
  AppKilledPlaybackBehavior = rntp.AppKilledPlaybackBehavior;
  IOSCategory = rntp.IOSCategory;
  IOSCategoryMode = rntp.IOSCategoryMode;
  IOSCategoryOptions = rntp.IOSCategoryOptions;
} catch {
  // Will be null in Expo Go
}

// Helper: resolve the TrackPlayer object regardless of export shape
function resolveTrackPlayer() {
  const rntp = require('react-native-track-player');
  const candidates = [
    (rntp as any)?.TrackPlayer,
    (rntp as any)?.default?.TrackPlayer,
    rntp?.default,
    rntp,
  ];
  for (const cand of candidates) {
    if (cand && typeof cand.getState === 'function' && typeof cand.stop === 'function') {
      return { tp: cand, State: rntp.State || cand.State };
    }
  }
  throw new Error('TrackPlayer methods not found on any export');
}

export async function setupPlayerOnce() {
  if (!isTrackPlayerSupported()) {
    console.warn('TrackPlayer not available (Expo Go mode) - skipping setup');
    return;
  }

  // Check if player is already initialized by trying to get state
  try {
    const { tp } = resolveTrackPlayer();
    const state = await tp.getState();
    console.log('✅ TrackPlayer already initialized, state:', state);
    return; // Player is already set up
  } catch (error: any) {
    // Player not initialized yet - this is expected on first run
    console.log('🎵 TrackPlayer needs initialization...');
  }

  try {
    const { tp } = resolveTrackPlayer();
    
    console.log('🎵 Calling TrackPlayer.setupPlayer...');
    await tp.setupPlayer({
      waitForBuffer: true,
      // iOS audio session configuration - this makes it appear in Control Center
      // and properly interrupt other audio
      ...(IOSCategory && {
        iosCategory: IOSCategory.Playback,
        iosCategoryMode: IOSCategoryMode?.SpokenAudio,
      }),
    });
    console.log('✅ TrackPlayer.setupPlayer completed');

    // Only update options if we have the Capability constants
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

/**
 * Stop the current sleep session if one is playing.
 * Call this before playing other audio (like coach samples).
 */
export async function stopSleepSession(): Promise<void> {
  if (!isTrackPlayerSupported()) {
    return;
  }
  
  try {
    const { tp, State } = resolveTrackPlayer();

    const state = await tp.getState();
    console.log('🔍 Current TrackPlayer state:', state);
    
    if (state !== State?.None && state !== State?.Stopped) {
      console.log('🛑 Stopping sleep session before playing other audio');
      await tp.stop();
      await tp.reset();
      await AsyncStorage.removeItem('theta_sleep_end_ts');
      await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'stopped');
      console.log('✅ Sleep session stopped successfully');
    } else {
      console.log('ℹ️ No active session to stop');
    }
  } catch (error) {
    console.warn('Failed to stop sleep session:', error);
  }
}

/**
 * Check if a sleep session is currently active/playing.
 */
export async function isSleepSessionActive(): Promise<boolean> {
  if (!isTrackPlayerSupported()) {
    return false;
  }
  
  try {
    const { tp, State } = resolveTrackPlayer();
    
    const state = await tp.getState();
    return state !== State?.None && state !== State?.Stopped;
  } catch {
    return false;
  }
}
