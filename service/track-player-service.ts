import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { PLAYER_STATE_STORAGE_KEY } from '../lib/audio/constants';

// Single in-memory cache to avoid reading storage too often
let sleepEndTs: number | null = null;
let timerCheckInterval: NodeJS.Timer | null = null;

async function loadSleepEndTs() {
  try {
    const raw = await AsyncStorage.getItem('theta_sleep_end_ts');
    sleepEndTs = raw ? Number(raw) : null;
  } catch (error) {
    console.warn('Failed to load sleep end time:', error);
    sleepEndTs = null;
  }
}

function startTimerGuard() {
  if (timerCheckInterval) return;
  timerCheckInterval = setInterval(async () => {
    if (!sleepEndTs) return;
    const now = Date.now();
    if (now >= sleepEndTs) {
      // Time's up: stop playback and clear notification
      try {
        await TrackPlayer.stop();
      } catch (error) {
        console.warn('Failed to stop TrackPlayer:', error);
      }
      clearTimerGuard();
    }
  }, 1000); // 1s resolution is fine for a sleep timer
}

function clearTimerGuard() {
  if (timerCheckInterval) {
    clearInterval(timerCheckInterval);
    timerCheckInterval = null;
  }
  sleepEndTs = null;
}

export default async function TrackPlayerService() {
  try {
    console.log('🎵 TrackPlayer service starting...');
    
    // When the service starts, load any scheduled end time and begin checking
    await loadSleepEndTs();
    if (sleepEndTs) {
      console.log('⏰ Found existing sleep timer, starting guard');
      startTimerGuard();
    }

    // Remote control events
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
      console.log('🎮 Remote play pressed');
      try {
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
        clearTimerGuard();
        await AsyncStorage.removeItem('theta_sleep_end_ts');
        await AsyncStorage.setItem(PLAYER_STATE_STORAGE_KEY, 'stopped');
        console.log('🛑 Session stopped from remote control');
      } catch (error) {
        console.warn('RemoteStop failed:', error);
      }
    });
    
    TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
      console.log('🎮 Remote seek to:', position);
      TrackPlayer.seekTo(position).catch(error => console.warn('RemoteSeek failed:', error));
    });

    // Keep an ear on progress to (re)load timer end if needed
    TrackPlayer.addEventListener(Event.PlaybackState, async ({ state }) => {
      console.log('🎵 Playback state changed:', state);
      // If we resume or start, make sure timer guard is alive and has an end time
      if (state === State.Playing) {
        if (!sleepEndTs) {
          console.log('⏰ Loading sleep timer from storage');
          await loadSleepEndTs();
        }
        if (sleepEndTs) {
          console.log('⏰ Starting timer guard');
          startTimerGuard();
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
