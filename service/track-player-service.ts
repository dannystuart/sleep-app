import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrackPlayer, isTrackPlayerSupported, safeTrackPlayerCall, getEventConstant, getStateConstant } from '../lib/audio/trackPlayerSafe';
import { PLAYER_STATE_STORAGE_KEY } from '../lib/audio/constants';

// Get Event and State dynamically at runtime (they may be null if TrackPlayer isn't loaded)
let Event: any = null;
let State: any = null;
try {
  const rntp = require('react-native-track-player');
  Event = rntp.Event;
  State = rntp.State;
} catch {
  // Fallback to safe wrappers
  Event = getEventConstant();
  State = getStateConstant();
}

// Single in-memory cache to avoid reading storage too often
let sleepEndTs: number | null = null;
// Flag to prevent multiple stop attempts
let isStoppingSession = false;

async function loadSleepEndTs() {
  try {
    const raw = await AsyncStorage.getItem('theta_sleep_end_ts');
    sleepEndTs = raw ? Number(raw) : null;
  } catch (error) {
    console.warn('Failed to load sleep end time:', error);
    sleepEndTs = null;
  }
}

// Check timer and stop if expired - called from PlaybackProgressUpdated event
// This event fires even when app is backgrounded because it's native
async function checkAndStopIfTimerExpired() {
  if (isStoppingSession) return;
  
  // Always reload from storage to stay in sync with UI pause/resume adjustments
  try {
    const raw = await AsyncStorage.getItem('theta_sleep_end_ts');
    sleepEndTs = raw ? Number(raw) : null;
  } catch (error) {
    console.warn('Failed to refresh sleep end time:', error);
    sleepEndTs = null;
  }

  if (!sleepEndTs) {
    return;
  }
  
  const now = Date.now();
  if (now >= sleepEndTs) {
    // Prevent multiple stop attempts
    isStoppingSession = true;
    
    // Time's up: stop playback and mark session as completed
    console.log('⏰ Sleep timer expired (background) - stopping audio and ending session');
    try {
      if (TrackPlayer && typeof TrackPlayer.stop === 'function') {
        await TrackPlayer.stop();
      }
      // Set a flag that the session timer has expired (so sleep session screen can complete it)
      await AsyncStorage.setItem('theta_session_timer_expired', 'true');
      await AsyncStorage.removeItem('theta_sleep_end_ts');
      await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'stopped');
      sleepEndTs = null;
      console.log('✅ Timer expired flag set - session will complete when app becomes active');
    } catch (error) {
      console.warn('Failed to stop TrackPlayer:', error);
    } finally {
      isStoppingSession = false;
    }
  }
}

// Reset the stopping flag when a new session starts
function resetStoppingFlag() {
  isStoppingSession = false;
}

export default async function TrackPlayerService() {
  if (!isTrackPlayerSupported() || !TrackPlayer) {
    console.warn('TrackPlayer not available (Expo Go mode) - service will not start');
    return;
  }

  try {
    console.log('🎵 TrackPlayer service starting...');
    
    // When the service starts, load any scheduled end time
    await loadSleepEndTs();
    if (sleepEndTs) {
      console.log('⏰ Found existing sleep timer end:', new Date(sleepEndTs).toLocaleTimeString());
    }

    // Remote control events
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
      console.log('🎮 Remote play pressed');
      try {
        resetStoppingFlag(); // Allow timer checks again
        await TrackPlayer.play();
        await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'playing');
      } catch (error) {
        console.warn('RemotePlay failed:', error);
      }
    });
    
    TrackPlayer.addEventListener(Event.RemotePause, async () => {
      console.log('🎮 Remote pause pressed');
      try {
        await TrackPlayer.pause();
        await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'paused');
      } catch (error) {
        console.warn('RemotePause failed:', error);
      }
    });
    
    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
      console.log('🎮 Remote stop pressed');
      try {
        await TrackPlayer.stop();
        sleepEndTs = null;
        await AsyncStorage.removeItem('theta_sleep_end_ts');
        await AsyncStorage.removeItem('theta_session_timer_expired');
        await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'stopped');
        console.log('🛑 Session stopped from remote control');
      } catch (error) {
        console.warn('RemoteStop failed:', error);
      }
    });
    
    TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }: { position: number }) => {
      console.log('🎮 Remote seek to:', position);
      TrackPlayer.seekTo(position).catch((error: unknown) => console.warn('RemoteSeek failed:', error));
    });

    // Use PlaybackProgressUpdated event to check timer - this fires even when app is backgrounded
    // because it's a native event, unlike JS setInterval which gets suspended
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async () => {
      // Check timer on every progress update (fires based on progressUpdateEventInterval from setup)
      await checkAndStopIfTimerExpired();
    });

    // Keep an ear on playback state changes
    TrackPlayer.addEventListener(Event.PlaybackState, async ({ state }: { state: number }) => {
      console.log('🎵 Playback state changed:', state);
      if (state === State.Playing) {
        resetStoppingFlag(); // Allow timer checks when playback starts
        // Reload timer end time when playback starts
        await loadSleepEndTs();
        if (sleepEndTs) {
          console.log('⏰ Timer active, will stop at:', new Date(sleepEndTs).toLocaleTimeString());
        }
        await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'playing');
      } else if (state === State.Paused || state === State.Stopped) {
        await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'paused');
      }
    });

    console.log('✅ TrackPlayer service initialized successfully');
  } catch (error) {
    console.warn('TrackPlayer service initialization failed:', error);
  }
}
