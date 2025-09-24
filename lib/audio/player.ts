// TrackPlayer setup with Expo Go fallback
let TrackPlayer: any = null;
let Capability: any = null;
let AppKilledPlaybackBehavior: any = null;

// Check if we're in Expo Go by looking for the module
const isExpoGo = typeof __DEV__ !== 'undefined' && __DEV__ && !(global as any).nativeCallSyncHook;

if (!isExpoGo) {
  try {
    const trackPlayerModule = require('react-native-track-player');
    TrackPlayer = trackPlayerModule.default;
    Capability = trackPlayerModule.Capability;
    AppKilledPlaybackBehavior = trackPlayerModule.AppKilledPlaybackBehavior;
  } catch (error) {
    console.warn('TrackPlayer not available, using fallback');
  }
} else {
  console.warn('Running in Expo Go, TrackPlayer not available');
}

export async function setupPlayerOnce() {
  if (!TrackPlayer) {
    console.warn('TrackPlayer not available, skipping setup');
    return;
  }

  try {
    const isSetup = await TrackPlayer.isServiceRunning();
    // isServiceRunning does not mean player is ready; guard with getState or try/catch init
    try {
      await TrackPlayer.getState();
      return;
    } catch {}

    await TrackPlayer.setupPlayer({
      waitForBuffer: true,
    });

    await TrackPlayer.updateOptions({
      // Show lock-screen / notification controls
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
      progressUpdateEventInterval: 1, // seconds for progress events
      // Android specific
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        // The service will stop + remove notif when we call TrackPlayer.stop()
        // so we don't leave a zombie notification.
      },
    });
  } catch (error) {
    console.warn('Failed to setup TrackPlayer:', error);
  }
}
