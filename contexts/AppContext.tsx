import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { AppContextType, AppState, Coach, Class, SessionAudio, SessionEvent, DiaryEntry, StreakState, StreakPublicState } from '../types';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { attachLocalDevGlobals, scheduleDailyReminder, cancelAllLocalReminders, scheduleOneOffIn, ensureLocalNotifPermission, scheduleBedtimeReminder, scheduleMorningReminder, scheduleAllDailyNotifications } from '../lib/localNotifications';
import { stopSleepSession } from '../lib/audio/player';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Asset } from "expo-asset";
import * as Font from 'expo-font';
// UUID helper function
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Image preloading function
const preloadCoachImages = async (coaches: Coach[]) => {
  try {
    console.log('🖼️ Preloading coach images...');
    const imageUris = coaches
      .map(coach => coach.image_url)
      .filter(Boolean) as string[];
    
    if (imageUris.length > 0) {
      await Image.prefetch(imageUris);
      console.log('✅ Coach images preloaded successfully');
    }
  } catch (error) {
    console.warn('⚠️ Failed to preload coach images:', error);
  }
};

// Background image preloading function
const preloadBackgroundImages = async () => {
  try {
    console.log("🖼️ Preloading background images...");
    
    // Preload all background images used across the app
    const backgroundImages = [
      // Main background images
      require("../assets/images/THETA-BG-TRANS.png"),
      require("../assets/images/THETA-BG.png"),
      
      // Onboarding specific images
      require("../assets/images/onboarding/onboarding-streak.png"),
      require("../assets/images/onboarding/onboarding-gradient.png"),
      require("../assets/images/onboarding/onboarding-moon.png"),
      require("../assets/images/onboarding/maths.png"),
      require("../assets/images/onboarding/memory.png"),
      require("../assets/images/onboarding/word.png"),
      
      // Icon images
      require("../assets/images/brain-icon.png"),
      require("../assets/images/moon-icon.png"),
      require("../assets/images/pause-icon.png"),
      require("../assets/images/play-btn-icon.png"),
      require("../assets/images/tap.png"),
    ];
    
    // Preload all background images using Asset.loadAsync for local images
    await Promise.all(backgroundImages.map(image => Asset.loadAsync(image)));
    console.log("✅ Background images preloaded successfully");
  } catch (error) {
    console.warn("⚠️ Failed to preload background images:", error);
  }
};

// Font preloading function (noop until you add actual fonts)
const preloadFonts = async () => {
  try {
    await Font.loadAsync({
      // e.g. 'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
      // Add your font map above when ready
    });
    console.log('✅ Fonts preloaded (or noop if none configured)');
  } catch (error) {
    console.warn('⚠️ Failed to preload fonts:', error);
  }
};
// Coach unlock milestones for UX copy (e.g., "Next coach unlock in N nights")
// Actual unlock logic reads each coach's own unlock_streak field
export const COACH_UNLOCK_MILESTONES = [3, 6, 8, 10];

// Pure helper to determine if a coach is unlocked based on best streak
// unlock_streak null/0 means always unlocked; otherwise best >= unlock_streak
// Once unlocked, coaches stay unlocked permanently (based on best streak ever achieved)
export function isCoachUnlocked(bestStreak: number, coach: Coach): boolean {
  const unlockRequirement = coach.unlock_streak;
  
  // null or 0 means always unlocked (starter coaches)
  if (!unlockRequirement || unlockRequirement === 0) {
    return true;
  }
  
  // Otherwise, best streak must meet or exceed requirement
  return bestStreak >= unlockRequirement;
}

// UK date helpers
const UK_TZ = 'Europe/London';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: UK_TZ, year:'numeric', month:'2-digit', day:'2-digit' });

function localDateKey(date = new Date()): string {
  return fmt.format(date); // "YYYY-MM-DD"
}

function addDays(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return localDateKey(d);
}

function isYesterday(prevKey: string, todayKey: string): boolean {
  return addDays(todayKey, -1) === prevKey;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  
  const [state, setState] = useState<AppState>({
    coaches: [],
    classes: [],
    sessionAudio: [],
    selectedCoachId: '',
    selectedClassId: '',
    timerSeconds: 20,
    isLoading: true,
  });

  // Add diary and streak state
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [streak, setStreak] = useState<StreakState>({
    current: 0,
    best: 0,
    lastDateKey: '',
    unlocked: [],
    seed: Math.floor(Math.random() * 1e9),
    sessionsByDate: {}
  });
  
  // Session state for notifications
  const [session, setSession] = useState<any>(null);
  
  // Test mode - set to true to allow multiple sessions per day
  const TEST_MODE = false;

  // ===== Announcements (queued to show on next app open) =====
  type Announcement =
    | { id: string; type: 'streak_plus'; createdAt: string; streak: number }
    | { id: string; type: 'reward_unlocked'; createdAt: string; streak: number; rewardId: string }
    | { id: string; type: 'coach_unlocked'; createdAt: string; streak: number; coachId: string; coachName: string };

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Test announcement state for debug panel
  const [testAnnouncement, setTestAnnouncement] = useState<{ type: 'streak_plus' | 'reward_unlocked'; streak: number; rewardId?: string } | null>(null);

  // Load data on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // A) expose dev console helpers (no UI)
  useEffect(() => {
    if (__DEV__) attachLocalDevGlobals();
  }, []);

  // C) automatically schedule daily notifications on app launch (only once)
  const [notificationsScheduled, setNotificationsScheduled] = useState(false);
  
  useEffect(() => {
    if (notificationsScheduled) return; // Prevent multiple scheduling
    
    (async () => {
      try {
        const results = await scheduleAllDailyNotifications();
        if (results.length > 0) {
          console.log('🔔 Daily notifications scheduled:', results);
          setNotificationsScheduled(true);
        }
      } catch (error) {
        console.error('❌ Failed to schedule daily notifications:', error);
      }
    })();
  }, [notificationsScheduled]); // Run once on app launch

  // B) navigate on notification tap (works for both push + local)
  //    also handles cold start case
  useEffect(() => {
    let sub: Notifications.Subscription | undefined;

    (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      const data = last?.notification?.request?.content?.data as any;
      if (data?.screen) {
        const path = String(data.screen);
        router.push((path.startsWith('/') ? path : `/${path}`) as any);
      }
    })();

    // Listen for incoming notifications while app is open
    const receivedSub = Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('🔔 Notification received in foreground:', notification);
      try {
        await setStorageItem('lastNotification', JSON.stringify({
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        console.error('Failed to save notification:', e);
      }
    });

    sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as any;
      if (data?.screen) {
        const path = String(data.screen);
        router.push((path.startsWith('/') ? path : `/${path}`) as any);
      }
    });

    return () => {
      sub?.remove();
      receivedSub.remove();
    };
  }, [router]);

  // Handle push notifications
  useEffect(() => {
    (async () => {
      const { token, error } = await registerForPushNotificationsAsync();
      if (token && !error) {
        // Persist in Supabase (idempotent-ish)
        try {
          await (supabase as any)
            .from('push_subscriptions')
            .upsert({
              user_id: session?.user?.id ?? null,
              expo_push_token: token,
              platform: Platform.OS,
              last_seen_at: new Date().toISOString(),
            }, { onConflict: 'expo_push_token' });
        } catch (dbError) {
          console.log('Push token table not found or error saving token:', dbError);
          // Continue without saving to database for now
        }
      } else {
        console.log('Push registration failed', error);
      }
    })();
  }, [session?.user?.id]);

  const initializeApp = async () => {
    try {
      // 1. Fetch coaches, classes, and session_audio from Supabase
      const [coachesResult, classesResult, sessionAudioResult] = await Promise.all([
        supabase.from('coaches').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('session_audio').select('*'),
      ]);

      let coaches: Coach[] = coachesResult.data || [];
      let classes: Class[] = classesResult.data || [];
      let sessionAudio: SessionAudio[] = sessionAudioResult.data || [];

      console.log('🔧 AppContext: Database coaches loaded:', coaches.length);
      console.log('🔧 AppContext: First coach unlock_card:', coaches[0]?.unlock_card);
      console.log('🔧 AppContext: Coaches (first 5) unlock_card hosts:', (coaches || []).slice(0,5).map(c => ({ name: c.name, host: (() => { try { const u = new URL(String(c.unlock_card||'')); return u.host; } catch { return null; } })() })));

      // Fallback mock data if database is empty
      if (coaches.length === 0) {
        coaches = [
          {
            id: 'coach-1',
            name: 'Sarah',
            locale: 'British',
            style: 'Smooth & Calm',
            image_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
            sample_audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            created_at: new Date().toISOString(),
            unlock_streak: 0 // Starter coach - always available
          },
          {
            id: 'coach-2',
            name: 'Michael',
            locale: 'American',
            style: 'Deep & Soothing',
            image_url: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=400',
            sample_audio: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
            created_at: new Date().toISOString(),
            unlock_streak: 3, // Unlocked at 3-day streak
            unlock_card: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=600&h=800' // Test unlock card - different size
          },
          {
            id: 'coach-3',
            name: 'Emma',
            locale: 'Australian',
            style: 'Gentle & Warm',
            image_url: 'https://images.pexels.com/photos/2379006/pexels-photo-2379006.jpeg?auto=compress&cs=tinysrgb&w=400',
            sample_audio: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
            created_at: new Date().toISOString(),
            unlock_streak: 6, // Unlocked at 6-day streak
            unlock_card: 'https://images.pexels.com/photos/2379006/pexels-photo-2379006.jpeg?auto=compress&cs=tinysrgb&w=400' // Test unlock card
          },
          {
            id: 'coach-4',
            name: 'James',
            locale: 'Canadian',
            style: 'Rich & Resonant',
            image_url: 'https://images.pexels.com/photos/2379007/pexels-photo-2379007.jpeg?auto=compress&cs=tinysrgb&w=400',
            sample_audio: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
            created_at: new Date().toISOString(),
            unlock_streak: 8, // Unlocked at 8-day streak
            unlock_card: 'https://images.pexels.com/photos/2379007/pexels-photo-2379007.jpeg?auto=compress&cs=tinysrgb&w=400' // Test unlock card
          },
          {
            id: 'coach-5',
            name: 'Sophia',
            locale: 'Irish',
            style: 'Melodic & Peaceful',
            image_url: 'https://images.pexels.com/photos/2379008/pexels-photo-2379008.jpeg?auto=compress&cs=tinysrgb&w=400',
            sample_audio: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
            created_at: new Date().toISOString(),
            unlock_streak: 10, // Unlocked at 10-day streak
            unlock_card: 'https://images.pexels.com/photos/2379008/pexels-photo-2379008.jpeg?auto=compress&cs=tinysrgb&w=400' // Test unlock card
          }
        ];
      }

      if (classes.length === 0) {
        classes = [
          {
            id: 'mixed-level-1',
            name: 'Mixed Level 1',
            tags: ['Maths', 'Memory', 'Word', 'Facts'],
            created_at: new Date().toISOString()
          },
          {
            id: 'maths',
            name: 'Maths',
            tags: ['Maths'],
            created_at: new Date().toISOString()
          },
          {
            id: 'memory',
            name: 'Memory',
            tags: ['Memory'],
            created_at: new Date().toISOString()
          }
        ] as Class[];
      }

      if (sessionAudio.length === 0) {
        // Create mock session audio entries for all coach+class combinations
        // Use the actual coach and class IDs from the database
        sessionAudio = coaches.flatMap(coach => 
          classes.map(cls => ({
            id: `audio-${coach.id}-${cls.id}`,
            coach_id: coach.id,
            class_id: cls.id,
            audio_url: '', // No audio URL for mock data
            created_at: new Date().toISOString()
          }))
        ) as SessionAudio[];
      }

      // 2. Load stored selections and local data
      const [storedCoachId, storedClassId, storedTimer, storedStreak, storedDiary, storedAnnouncements] = await Promise.all([
        getStorageItem('coachId'),
        getStorageItem('classId'),
        getStorageItem('timerSeconds'),
        getStorageItem('streak'),
        getStorageItem('diary'),
        getStorageItem('announcements'),
      ]);

      // 3. Set defaults if no stored values
      let selectedCoachId = storedCoachId || coaches[0]?.id || '';
      let selectedClassId = storedClassId || classes[0]?.id || '';
      const timerSeconds = storedTimer ? parseInt(storedTimer, 10) : 20;

      console.log('🔧 AppContext: Loaded stored values:', {
        storedCoachId,
        storedClassId,
        storedTimer,
        selectedCoachId,
        selectedClassId,
        timerSeconds
      });

      const foundCoach = coaches.find(c => c.id === selectedCoachId);
      const foundClass = classes.find(c => c.id === selectedClassId);
      
      // Only reset if the stored IDs don't exist in the data at all
      if (!foundCoach && coaches.length > 0) {
        selectedCoachId = coaches[0].id;
      }
      
      if (!foundClass && classes.length > 0) {
        selectedClassId = classes[0].id;
      }

      // Don't reset based on session_audio - let the UI handle missing audio gracefully
      const sessionAudioExists = sessionAudio.some(sa => 
        sa.coach_id === selectedCoachId && sa.class_id === selectedClassId
      );

      // Load streak and diary data
      if (storedStreak) {
        try {
          const parsed = JSON.parse(storedStreak);
          // Validate and sanitize loaded streak data
          setStreak({
            ...parsed,
            current: typeof parsed.current === 'number' ? parsed.current : 0,
            best: typeof parsed.best === 'number' ? parsed.best : 0,
            // Ensure sessionsByDate is an object
            sessionsByDate: parsed.sessionsByDate || {},
            unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : []
          });
        } catch (error) {
          console.error('Error parsing stored streak:', error);
        }
      }
      if (storedDiary) {
        try {
          setDiary(JSON.parse(storedDiary));
        } catch (error) {
          console.error('Error parsing stored diary:', error);
        }
      }
      if (storedAnnouncements) {
        try {
          setAnnouncements(JSON.parse(storedAnnouncements));
        } catch (error) {
          console.error('Error parsing stored announcements:', error);
        }
      }

      // Debug log to verify coaches have unlock_streak values
      console.log('🎯 Coaches loaded with unlock requirements:', coaches.map(c => ({ 
        id: c.id, 
        name: c.name, 
        unlock_streak: c.unlock_streak 
      })));

      // Test the isCoachUnlocked helper with various combinations
      console.log('🧪 Testing isCoachUnlocked helper:');
      const testCases = [
        { best: 2, coach: coaches.find(c => c.unlock_streak === 3) }, // Should be false
        { best: 3, coach: coaches.find(c => c.unlock_streak === 3) }, // Should be true  
        { best: 10, coach: coaches.find(c => c.unlock_streak === 0) }, // Should be true
        { best: 1, coach: coaches.find(c => c.unlock_streak === 0) }, // Should be true
        { best: 5, coach: coaches.find(c => c.unlock_streak === 6) }, // Should be false
        { best: 8, coach: coaches.find(c => c.unlock_streak === 6) }, // Should be true
      ];
      
      testCases.forEach(({ best, coach }, index) => {
        if (coach) {
          const result = isCoachUnlocked(best, coach);
          console.log(`  Test ${index + 1}: best=${best}, unlock=${coach.unlock_streak}, coach=${coach.name} → ${result}`);
        }
      });

      // Preload assets that affect first paint; await to avoid first-frame jank
      await Promise.all([
        preloadCoachImages(coaches),
        preloadBackgroundImages(),
        preloadFonts(),
      ]);
      
      console.log('🔧 AppContext: Setting final state:', {
        selectedCoachId,
        selectedClassId,
        timerSeconds,
        coachesCount: coaches.length,
        classesCount: classes.length
      });
      
      setState({
        coaches,
        classes,
        sessionAudio,
        selectedCoachId,
        selectedClassId,
        timerSeconds,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error initializing app:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Helper function to get audio URL for a coach+class combination
  const getAudioUrl = (coachId: string, classId: string): string | null => {
    const sessionAudioEntry = state.sessionAudio.find(
      sa => sa.coach_id === coachId && sa.class_id === classId
    );
    return sessionAudioEntry?.audio_url || null;
  };

  const setCoach = async (id: string) => {
    console.log('🔧 AppContext: setCoach called with id:', id);
    try {
      // Check if this coach exists
      const coachExists = state.coaches.some(c => c.id === id);
      if (!coachExists) {
        console.error('Coach not found:', id);
        return;
      }

      // Stop any active sleep session when settings change
      await stopSleepSession();

      // Check if the new coach+class combination has session audio
      const sessionAudioExists = state.sessionAudio.some(sa => 
        sa.coach_id === id && sa.class_id === state.selectedClassId
      );
      
      if (!sessionAudioExists) {
        console.warn('No session audio found for coach+class combination:', { coachId: id, classId: state.selectedClassId });
        // Still allow the change, but warn the user
      }

      await setStorageItem('coachId', id);
      setState(prev => ({ ...prev, selectedCoachId: id }));
      
      // Log analytics event
      await logEvent({
        event_type: 'select_coach',
        coach_id: id,
      });
    } catch (error) {
      console.error('Error setting coach:', error);
    }
  };

  const setClass = async (id: string) => {
    console.log('🔧 AppContext: setClass called with id:', id);
    try {
      // Check if this class exists
      const classExists = state.classes.some(c => c.id === id);
      if (!classExists) {
        console.error('Class not found:', id);
        return;
      }

      // Stop any active sleep session when settings change
      await stopSleepSession();

      // Check if the new coach+class combination has session audio
      const sessionAudioExists = state.sessionAudio.some(sa => 
        sa.coach_id === state.selectedCoachId && sa.class_id === id
      );
      
      if (!sessionAudioExists) {
        console.warn('No session audio found for coach+class combination:', { coachId: state.selectedCoachId, classId: id });
        // Still allow the change, but warn the user
      }

      await setStorageItem('classId', id);
      setState(prev => ({ ...prev, selectedClassId: id }));
      
      // Log analytics event
      await logEvent({
        event_type: 'select_class',
        class_id: id,
      });
    } catch (error) {
      console.error('Error setting class:', error);
    }
  };

  const setTimer = async (seconds: number) => {
    try {
      // Stop any active sleep session when settings change
      await stopSleepSession();

      await setStorageItem('timerSeconds', seconds.toString());
      setState(prev => ({ ...prev, timerSeconds: seconds }));
      
      // Log analytics event
      await logEvent({
        event_type: 'select_timer',
        timer_seconds: seconds,
      });
    } catch (error) {
      console.error('Error setting timer:', error);
    }
  };

  // Save helpers
  async function saveStreak(next: StreakState) {
    setStreak(next);
    try {
      await setStorageItem('streak', JSON.stringify(next));
      console.log('💾 Streak saved successfully');
    } catch (error) {
      console.error('Error saving streak:', error);
    }
  }

  async function saveDiary(next: DiaryEntry[]) {
    setDiary(next);
    try {
      await setStorageItem('diary', JSON.stringify(next));
      console.log('💾 Diary saved successfully');
    } catch (error) {
      console.error('Error saving diary:', error);
    }
  }

  async function pushAnnouncement(a: Announcement) {
    const next = [a, ...announcements].slice(0, 10); // cap to 10
    setAnnouncements(next);
    try {
      await setStorageItem('announcements', JSON.stringify(next));
    } catch (err) {
      console.error('Error saving announcements:', err);
    }
  }

  async function shiftAnnouncement() {
    const next = announcements.slice(1);
    setAnnouncements(next);
    try {
      await setStorageItem('announcements', JSON.stringify(next));
    } catch (err) {
      console.error('Error saving announcements:', err);
    }
  }

  // DEV helper: enqueue a test announcement so AnnouncementSheet pops on Home
  async function devPushAnnouncement(
    type: 'streak_plus' | 'reward_unlocked' | 'coach_unlocked',
    opts?: { streak?: number; rewardId?: string; coachId?: string; coachName?: string }
  ) {
    const s = opts?.streak ?? streak.current;
    const base = { id: uid(), createdAt: new Date().toISOString(), streak: s } as const;
    
    let a: Announcement;
    if (type === 'streak_plus') {
      a = { ...base, type: 'streak_plus' };
    } else if (type === 'reward_unlocked') {
      a = { ...base, type: 'reward_unlocked', rewardId: opts?.rewardId ?? 'bg.glow1' };
    } else {
      // coach_unlocked — pick strictly by the streak unless "forceCoach" is true
      const targetStreak = base.streak;
      const byStreak = state.coaches.find(c => Number(c.unlock_streak) === Number(targetStreak));

      // Optional: allow an explicit override only if a flag is set
      const forceCoach = (opts as any)?.forceCoach === true;

      const chosen = forceCoach
        ? state.coaches.find(c => String(c.id) === String(opts?.coachId)) || byStreak || state.coaches[0]
        : byStreak || state.coaches[0];

      a = {
        ...base,
        type: 'coach_unlocked',
        coachId: String(chosen?.id || ''),
        coachName: String(chosen?.name || 'Unknown'),
      };

      console.log('🔧 devPushAnnouncement: chosen coach for unlock', {
        streak: targetStreak,
        chosen: {
          id: chosen?.id,
          name: chosen?.name,
          unlock_streak: chosen?.unlock_streak,
          unlock_card: chosen?.unlock_card,
        },
        overrideUsed: forceCoach,
      });
    }

    console.log('devPushAnnouncement ->', a);
    await pushAnnouncement(a);
  }

  // DEV helper: directly show a test announcement (for debug panel)
  function devShowTestAnnouncement(
    type: 'streak_plus' | 'reward_unlocked',
    opts?: { streak?: number; rewardId?: string }
  ) {
    console.log('🔧 Context: devShowTestAnnouncement called', { type, opts });
    const s = opts?.streak ?? streak.current;
    const newAnnouncement = {
      type,
      streak: s,
      rewardId: type === 'reward_unlocked' ? (opts?.rewardId ?? 'bg.glow1') : undefined
    };
    console.log('🔧 Context: Setting testAnnouncement to:', newAnnouncement);
    setTestAnnouncement(newAnnouncement);
    console.log('🔧 Context: testAnnouncement state should be updated');
  }
  // DEV helper: clear test announcement
  function devClearTestAnnouncement() {
    setTestAnnouncement(null);
  }

  // Diary API
  async function addDiaryEntry(e: Omit<DiaryEntry, 'id'|'createdAt'>) {
    const entry: DiaryEntry = {
      ...e,
      id: uid(),
      createdAt: new Date().toISOString()
    };
    const next = [entry, ...diary].sort((a,b) => (a.dateKey < b.dateKey ? 1 : -1));
    await saveDiary(next);
    return entry;
  }

  async function rateDiaryEntry(id: string, rating: 'Good'|'OK'|'Poor') {
    const next = diary.map(d => d.id === id ? { ...d, rating } : d);
    await saveDiary(next);
  }

  // Variable reward system
  const milestones = [1,3,5,7,10];
  const rewardPoolA = ['moon.new','bg.glow1','badge.spark'];
  const rewardPoolB = ['moon.crescent','bg.glow2','badge.wave'];
  const rewardPoolC = ['task.packA','task.packB','bg.glow2'];

  function seededPick(list: string[], seed: number, salt: number) {
    // tiny xorshift-ish
    let x = (seed ^ salt) >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    const idx = Math.abs(x) % list.length;
    return list[idx];
  }

  // Streak functions
  async function onSessionComplete({ coachName, className }: { coachName: string; className: string }) {
    const today = localDateKey();
    console.log('📅 Session completed on:', today);
    console.log('📊 Current streak state:', { 
      current: streak.current, 
      lastDateKey: streak.lastDateKey,
      best: streak.best 
    });
    
    // Capture best streak before mutation for coach unlock detection
    const bestBefore = streak.best;
    
    let next = { ...streak };

    console.log('🧪 TEST_MODE:', TEST_MODE);
    console.log('📅 Today:', today);
    console.log('📅 Last date:', next.lastDateKey);
    console.log('🔍 Is yesterday?', next.lastDateKey && isYesterday(next.lastDateKey, today));
    
    if (next.lastDateKey === today && !TEST_MODE) {
      console.log('⚠️ Already completed a session today - streak unchanged');
      // already counted today
    } else if (next.lastDateKey && isYesterday(next.lastDateKey, today)) {
      console.log('🔥 Consecutive day - incrementing streak from', next.current, 'to', next.current + 1);
      next.current += 1;
    } else if (next.lastDateKey === today && TEST_MODE) {
      console.log('🧪 Test mode - incrementing streak from', next.current, 'to', next.current + 1);
      next.current += 1;
    } else {
      console.log('🔄 New day or gap - resetting streak to 1');
      next.current = 1;
    }

    // Safety check: current streak should never be 0 after a session
    if (next.current < 1) {
      console.warn('⚠️ Streak calculation resulted in < 1, forcing to 1');
      next.current = 1;
    }

    if (next.current > next.best) {
      console.log('🏆 New best streak!', next.current);
      next.best = next.current;
    }
    next.lastDateKey = today;
    next.sessionsByDate[today] = true;

    // Reward
    let rewardId: string | null = null;
    if (milestones.includes(next.current)) {
      const pool = next.current <= 3 ? rewardPoolA : next.current <= 7 ? rewardPoolB : rewardPoolC;
      const pick = seededPick(pool, next.seed, next.current);
      if (!next.unlocked.includes(pick)) {
        next.unlocked = [...next.unlocked, pick];
        rewardId = pick;
      }
    }

    await saveStreak(next);

    // Get best streak after mutation for coach unlock detection
    const bestAfter = next.best;

    // Check for newly unlocked coaches
    const newlyUnlocked = state.coaches.filter(coach => {
      const unlockReq = coach.unlock_streak;
      // Only consider coaches with unlock requirements > 0
      if (!unlockReq || unlockReq === 0) return false;
      // Coach is newly unlocked if: bestBefore < unlock_streak <= bestAfter
      return bestBefore < unlockReq && unlockReq <= bestAfter;
    });

    console.log('🎯 Coach unlock check:', { bestBefore, bestAfter, newlyUnlocked: newlyUnlocked.map(c => ({ name: c.name, unlock: c.unlock_streak })) });

    // Announcement priority: coach unlock > reward unlock > streak plus
    if (newlyUnlocked.length > 0) {
      // Option B: Announce the highest unlocked coach only
      const highestUnlocked = newlyUnlocked.sort((a, b) => (b.unlock_streak || 0) - (a.unlock_streak || 0))[0];
      console.log('🎉 Coach unlocked:', highestUnlocked.name, 'at streak', bestAfter);
      
      await pushAnnouncement({
        id: uid(),
        type: 'coach_unlocked',
        createdAt: new Date().toISOString(),
        streak: bestAfter,
        coachId: highestUnlocked.id,
        coachName: highestUnlocked.name,
      });
    } else if (rewardId) {
      // Reward announcement enqueue
      await pushAnnouncement({
        id: uid(),
        type: 'reward_unlocked',
        createdAt: new Date().toISOString(),
        streak: next.current,
        rewardId,
      });
    } else {
      // Default streak plus announcement
      await pushAnnouncement({
        id: uid(),
        type: 'streak_plus',
        createdAt: new Date().toISOString(),
        streak: next.current,
      });
    }

    // Also add diary entry for today if not present
    if (!diary.some(d => d.dateKey === today)) {
      await addDiaryEntry({
        dateKey: today,
        coachName,
        className,
        rating: null
      });
    }

    return { rewardId };
  }

  async function getStreakState(): Promise<StreakPublicState> {
    const today = localDateKey();
    const last7: { key: string; done: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const key = addDays(today, -i);
      last7.push({ key, done: Boolean(streak.sessionsByDate[key]) });
    }

    const nextMilestone = milestones.find(m => m > streak.current) ?? null;
    const daysToNext = nextMilestone ? Math.max(0, nextMilestone - streak.current) : null;
    const nextRewardPreviewId = nextMilestone
      ? (nextMilestone <= 3 ? rewardPoolA[0] : nextMilestone <= 7 ? rewardPoolB[0] : rewardPoolC[0])
      : null;

    return {
      current: streak.current,
      best: streak.best,
      nextMilestone,
      daysToNext,
      nextRewardPreviewId,
      last7
    };
  }

  // Get next coach unlock milestone for UX copy
  function getNextCoachUnlock(currentBest: number): { milestone: number | null; daysToNext: number | null } {
    const nextMilestone = COACH_UNLOCK_MILESTONES.find(m => m > currentBest) ?? null;
    const daysToNext = nextMilestone ? Math.max(0, nextMilestone - currentBest) : null;
    console.log('🎯 Next coach unlock calculation:', { currentBest, milestones: COACH_UNLOCK_MILESTONES, nextMilestone, daysToNext });
    return { milestone: nextMilestone, daysToNext };
  }

  // Get next coach unlock threshold from actual coach data
  function getNextCoachThreshold(currentStreak: number): { threshold: number | null; daysToNext: number | null; coachName: string | null } {
    // Find coaches with unlock requirements > current streak, ignoring 0
    const lockedCoaches = state.coaches
      .filter(coach => {
        const req = coach.unlock_streak;
        return req && req > 0 && req > currentStreak;
      })
      .sort((a, b) => (a.unlock_streak || 0) - (b.unlock_streak || 0));

    const nextCoach = lockedCoaches[0];
    if (!nextCoach || !nextCoach.unlock_streak) {
      return { threshold: null, daysToNext: null, coachName: null };
    }

    const daysToNext = Math.max(0, nextCoach.unlock_streak - currentStreak);
    console.log('🎯 Next coach threshold calculation:', { currentStreak, nextCoach: nextCoach.name, threshold: nextCoach.unlock_streak, daysToNext });
    
    return { 
      threshold: nextCoach.unlock_streak, 
      daysToNext, 
      coachName: nextCoach.name 
    };
  }

  // Test function to manually increment streak
  async function testIncrementStreak() {
    console.log('🧪 Manual streak increment test');
    const today = localDateKey();
    console.log('📅 Using date key:', today);
    console.log('📅 Current date:', new Date().toISOString());
    
    let next = { ...streak };
    console.log('📊 Before increment:', { current: next.current, lastDateKey: next.lastDateKey });
    
    next.current += 1;
    if (next.current > next.best) next.best = next.current;
    next.lastDateKey = today;
    next.sessionsByDate[today] = true;
    
    console.log('📊 After increment:', { current: next.current, lastDateKey: next.lastDateKey });
    console.log('📅 Sessions by date:', next.sessionsByDate);
    
    await saveStreak(next);
    console.log('✅ Streak manually incremented to:', next.current);
  }

  // DEV helper to hard-set streak to N and backfill last N days
  async function devSetStreakDays(n: number) {
    const today = localDateKey();
    const next = { ...streak, current: n, best: Math.max(streak.best, n), lastDateKey: today, sessionsByDate: {} as Record<string, true> };
    for (let i = 0; i < n; i++) {
      const key = addDays(today, -i);
      next.sessionsByDate[key] = true;
    }
    await saveStreak(next);
    console.log(`🧪 devSetStreakDays -> set to ${n} days, backfilled ${n} dates`);
  }

  // DEV helper to clear streak
  async function devResetStreak() {
    const next = { ...streak, current: 0, best: 0, lastDateKey: '', sessionsByDate: {} as Record<string, true> };
    await saveStreak(next);
    console.log('🧪 devResetStreak -> cleared streak state (including best)');
  }

  const logEvent = async (event: Omit<SessionEvent, 'id' | 'occurred_at'>) => {
    try {
      await supabase.from('session_events').insert([event] as any);
    } catch (error) {
      console.error('Error logging event:', error);
    }
  };

  const contextValue: AppContextType = {
    ...state,
    setCoach,
    setClass,
    setTimer,
    logEvent,
    getAudioUrl,
    diary,
    addDiaryEntry,
    rateDiaryEntry,
    announcements,
    shiftAnnouncement,
    devPushAnnouncement,
    testAnnouncement,              // expose live test announcement state
    devShowTestAnnouncement,       // show once (debug)
    devClearTestAnnouncement,      // clear it
    getNextCoachUnlock,            // get next coach unlock milestone for UX copy
    getNextCoachThreshold,         // get next coach unlock threshold from actual coaches
    isCoachUnlocked, // coach unlock helper
    streak: {
      getState: getStreakState,
      onSessionComplete,
      testIncrementStreak,
      devSetStreakDays,
      devResetStreak,
    },
    // Local notifications
    scheduleDailyReminder,
    scheduleBedtimeReminder,
    scheduleMorningReminder,
    scheduleAllDailyNotifications,
    cancelAllLocalReminders,
    scheduleOneOffIn,
    ensureLocalNotifPermission,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 