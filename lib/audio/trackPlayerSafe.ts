// Safe TrackPlayer wrapper for Expo Go compatibility
// In Expo Go, react-native-track-player is not available, so we provide a fallback

let TrackPlayerModule: any = null;
let TrackPlayerEvent: any = null;
let TrackPlayerState: any = null;
let TrackPlayerCapability: any = null;
let TrackPlayerAppKilledBehavior: any = null;
let isTrackPlayerAvailable = false;
let hasTriedToLoad = false;
let loadError: string | null = null;

// Try to load TrackPlayer directly - this is the most reliable way to detect
function tryLoadTrackPlayer(): boolean {
  if (hasTriedToLoad) {
    return isTrackPlayerAvailable;
  }
  
  hasTriedToLoad = true;
  
  try {
    // Try to require the native module directly
    const rntp = require('react-native-track-player');
    
    // The default export is the TrackPlayer object
    if (rntp && rntp.default) {
      TrackPlayerModule = rntp.default;
    } else if (rntp) {
      TrackPlayerModule = rntp;
    }
    
    // Event, State, Capability, etc. are NAMED exports, not properties of default
    TrackPlayerEvent = rntp.Event;
    TrackPlayerState = rntp.State;
    TrackPlayerCapability = rntp.Capability;
    TrackPlayerAppKilledBehavior = rntp.AppKilledPlaybackBehavior;
    
    // Verify it's actually TrackPlayer by checking for key methods
    if (TrackPlayerModule && 
        typeof TrackPlayerModule.setupPlayer === 'function' &&
        typeof TrackPlayerModule.play === 'function') {
      isTrackPlayerAvailable = true;
      console.log('✅ TrackPlayer loaded successfully, Event:', !!TrackPlayerEvent, 'State:', !!TrackPlayerState);
      return true;
    } else {
      loadError = 'TrackPlayer module found but missing required methods';
      console.warn('⚠️', loadError);
    }
  } catch (error: any) {
    // This is expected in Expo Go - the native module won't be available
    loadError = error?.message || 'Unknown error loading TrackPlayer';
    console.log('ℹ️ TrackPlayer not available:', loadError);
  }
  
  isTrackPlayerAvailable = false;
  return false;
}

// Create getters that lazy-load
function getTrackPlayer() {
  if (!hasTriedToLoad) {
    tryLoadTrackPlayer();
  }
  return isTrackPlayerAvailable && TrackPlayerModule ? TrackPlayerModule : null;
}

function getCapability() {
  if (!hasTriedToLoad) {
    tryLoadTrackPlayer();
  }
  return TrackPlayerCapability;
}

function getAppKilledPlaybackBehavior() {
  if (!hasTriedToLoad) {
    tryLoadTrackPlayer();
  }
  return TrackPlayerAppKilledBehavior;
}

function getEvent() {
  if (!hasTriedToLoad) {
    tryLoadTrackPlayer();
  }
  return TrackPlayerEvent;
}

function getState() {
  if (!hasTriedToLoad) {
    tryLoadTrackPlayer();
  }
  return TrackPlayerState;
}

// Export a proxy object for TrackPlayer that lazy-loads
export const TrackPlayer = new Proxy({} as any, {
  get(_target, prop) {
    const tp = getTrackPlayer();
    if (!tp) {
      // Return a no-op function for methods
      if (typeof prop === 'string' && prop.length > 0) {
        return () => {
          console.warn(`TrackPlayer.${prop} called but TrackPlayer is not available`);
          return Promise.resolve();
        };
      }
      return undefined;
    }
    const value = tp[prop];
    // If it's a function, bind it to the TrackPlayer instance
    if (typeof value === 'function') {
      return value.bind(tp);
    }
    return value;
  }
});

// Export getter functions for runtime evaluation
export function getEventConstant() {
  return getEvent();
}

export function getStateConstant() {
  return getState();
}

// Keep backward compatibility exports
export const Capability = getCapability();
export const AppKilledPlaybackBehavior = getAppKilledPlaybackBehavior();
export const Event = getEvent();
export const State = getState();

export function isTrackPlayerSupported(): boolean {
  if (!hasTriedToLoad) {
    return tryLoadTrackPlayer();
  }
  return isTrackPlayerAvailable;
}

// Get load error for debugging
export function getLoadError(): string | null {
  return loadError;
}

// Get detection info for debugging
export function getDetectionLog(): string[] {
  return [
    `hasTriedToLoad: ${hasTriedToLoad}`,
    `isTrackPlayerAvailable: ${isTrackPlayerAvailable}`,
    `loadError: ${loadError || 'none'}`,
    `hasModule: ${!!TrackPlayerModule}`,
    `hasEvent: ${!!TrackPlayerEvent}`,
    `hasState: ${!!TrackPlayerState}`,
  ];
}

// Safe wrapper functions
export async function safeTrackPlayerCall<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  if (!isTrackPlayerSupported()) {
    return fallback;
  }
  try {
    return await fn();
  } catch (error) {
    console.warn('TrackPlayer call failed:', error);
    return fallback;
  }
}

export function safeTrackPlayerSyncCall<T>(
  fn: () => T,
  fallback?: T
): T | undefined {
  if (!isTrackPlayerSupported()) {
    return fallback;
  }
  try {
    return fn();
  } catch (error) {
    console.warn('TrackPlayer call failed:', error);
    return fallback;
  }
}
