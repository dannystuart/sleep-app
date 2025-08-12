import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { AppContextType, AppState, Coach, Class, SessionAudio, SessionEvent, DiaryEntry, StreakState, StreakPublicState } from '../types';

// UUID helper function
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

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
  
  // Test mode - set to true to allow multiple sessions per day
  const TEST_MODE = true;

  // ===== Announcements (queued to show on next app open) =====
  type Announcement =
    | { id: string; type: 'streak_plus'; createdAt: string; streak: number }
    | { id: string; type: 'reward_unlocked'; createdAt: string; streak: number; rewardId: string };

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Load data on mount
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // 1. Fetch coaches, classes, and session_audio from Supabase
      const [coachesResult, classesResult, sessionAudioResult] = await Promise.all([
        supabase.from('coaches').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('session_audio').select('*'),
      ]);

      let coaches = coachesResult.data || [];
      let classes = classesResult.data || [];
      let sessionAudio = sessionAudioResult.data || [];

      // Fallback mock data if database is empty
      if (coaches.length === 0) {
        coaches = [
          {
            id: 'coach-1',
            name: 'Sarah',
            locale: 'British',
            style: 'Smooth & Calm',
            image_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
            created_at: new Date().toISOString()
          },
          {
            id: 'coach-2',
            name: 'Michael',
            locale: 'American',
            style: 'Deep & Soothing',
            image_url: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=400',
            created_at: new Date().toISOString()
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
        ];
      }

      if (sessionAudio.length === 0) {
        // Create mock session audio entries for all coach+class combinations
        // Use the actual coach and class IDs from the database
        sessionAudio = coaches.flatMap(coach => 
          classes.map(cls => ({
            id: `audio-${coach.id}-${cls.id}`,
            coach_id: coach.id,
            class_id: cls.id,
            audio_url: null, // No audio URL for mock data
            created_at: new Date().toISOString()
          }))
        );
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
          setStreak(JSON.parse(storedStreak));
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
    try {
      // Check if this coach exists
      const coachExists = state.coaches.some(c => c.id === id);
      if (!coachExists) {
        console.error('Coach not found:', id);
        return;
      }

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
    try {
      // Check if this class exists
      const classExists = state.classes.some(c => c.id === id);
      if (!classExists) {
        console.error('Class not found:', id);
        return;
      }

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

    // Reward announcement enqueue (MVP: show ONE thing next open)
    if (rewardId) {
      await pushAnnouncement({
        id: uid(),
        type: 'reward_unlocked',
        createdAt: new Date().toISOString(),
        streak: next.current,
        rewardId,
      });
    } else {
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
    const next = { ...streak, current: 0, lastDateKey: '', sessionsByDate: {} as Record<string, true> };
    await saveStreak(next);
    console.log('🧪 devResetStreak -> cleared streak state');
  }

  const logEvent = async (event: Omit<SessionEvent, 'id' | 'occurred_at'>) => {
    try {
      await supabase.from('session_events').insert([event]);
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
    streak: {
      getState: getStreakState,
      onSessionComplete,
      testIncrementStreak, // Add test function
      devSetStreakDays,
      devResetStreak,
    },
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