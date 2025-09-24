// TrackPlayer setup with Expo Go fallback
import TrackPlayer, { Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';

export async function setupPlayerOnce() {
  try {
    // Attempt to get current state. If this succeeds, player is already initialized.
    await TrackPlayer.getState();
    return;
  } catch {}

  try {
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
      progressUpdateEventInterval: 1,
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
    });
  } catch (error) {
    console.warn('Failed to setup TrackPlayer:', error);
  }
}
