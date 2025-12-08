// TrackPlayer setup with Expo Go fallback
import { 
  TrackPlayer, 
  isTrackPlayerSupported,
  safeTrackPlayerCall 
} from './trackPlayerSafe';

// Get Capability and AppKilledPlaybackBehavior directly from the module
let Capability: any = null;
let AppKilledPlaybackBehavior: any = null;

try {
  const rntp = require('react-native-track-player');
  Capability = rntp.Capability;
  AppKilledPlaybackBehavior = rntp.AppKilledPlaybackBehavior;
} catch {
  // Will be null in Expo Go
}

export async function setupPlayerOnce() {
  if (!isTrackPlayerSupported()) {
    console.warn('TrackPlayer not available (Expo Go mode) - skipping setup');
    return;
  }

  // Check if player is already initialized by trying to get state
  try {
    // Get TrackPlayer directly to avoid the safe wrapper eating the error
    const rntp = require('react-native-track-player');
    const tp = rntp.default || rntp;
    const state = await tp.getState();
    console.log('✅ TrackPlayer already initialized, state:', state);
    return; // Player is already set up
  } catch (error: any) {
    // Player not initialized yet - this is expected on first run
    console.log('🎵 TrackPlayer needs initialization...');
  }

  try {
    // Use direct import to avoid proxy issues
    const rntp = require('react-native-track-player');
    const tp = rntp.default || rntp;
    
    console.log('🎵 Calling TrackPlayer.setupPlayer...');
    await tp.setupPlayer({
      waitForBuffer: true,
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
