// Mock TrackPlayer for Expo Go compatibility
// This file is used when react-native-track-player is not available

export default {
  setupPlayer: () => Promise.resolve(),
  updateOptions: () => Promise.resolve(),
  add: () => Promise.resolve(),
  play: () => Promise.resolve(),
  pause: () => Promise.resolve(),
  stop: () => Promise.resolve(),
  reset: () => Promise.resolve(),
  getState: () => Promise.resolve(0), // State.None
  getPosition: () => Promise.resolve(0),
  getDuration: () => Promise.resolve(0),
  seekTo: () => Promise.resolve(),
  getCurrentTrack: () => Promise.resolve(null),
  registerPlaybackService: () => {},
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
};

export const Capability = {};
export const AppKilledPlaybackBehavior = {};
export const Event = {};
export const State = {
  None: 0,
  Ready: 1,
  Playing: 2,
  Paused: 3,
  Stopped: 4,
  Buffering: 5,
  Loading: 6,
  Error: 7,
};



