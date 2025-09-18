export interface Coach {
  id: string;
  name: string;
  locale?: string;
  style?: string;
  image_url: string;
  sample_audio?: string;
  created_at?: string;
  unlock_streak?: number; // Streak required to unlock this coach (0 or null = always available)
}

// Type alias for clarity in choose-coach screen
export type CoachWithRequirement = Coach & {
  streak_required?: number | null; // Alias for unlock_streak
};

export interface Class {
  id: string;
  name: string;
  tags: string[];
  image_url?: string;
  sample_audio?: string;
  created_at?: string;
}

export interface SessionAudio {
  id: string;
  coach_id: string;
  class_id: string;
  audio_url: string;
  created_at?: string;
}

export interface SessionEvent {
  id?: string;
  event_type: string;
  coach_id?: string;
  class_id?: string;
  timer_seconds?: number;
  occurred_at?: string;
}

export interface AppState {
  coaches: Coach[];
  classes: Class[];
  sessionAudio: SessionAudio[];
  selectedCoachId: string;
  selectedClassId: string;
  timerSeconds: number;
  isLoading: boolean;
}

export type DiaryRating = 'Good' | 'OK' | 'Poor' | null;

export interface DiaryEntry {
  id: string;            // uuid
  dateKey: string;       // "YYYY-MM-DD" UK local
  coachName: string;
  className: string;
  rating: DiaryRating;   // null until user rates
  createdAt: string;     // ISO
}

export interface StreakState {
  current: number;
  best: number;
  lastDateKey: string;   // "YYYY-MM-DD"
  unlocked: string[];    // reward ids
  seed: number;          // for deterministic reward picks
  sessionsByDate: Record<string, true>;
}

export interface StreakPublicState {
  current: number;
  best: number;
  nextMilestone: number | null;
  daysToNext: number | null;
  nextRewardPreviewId: string | null;
  last7: { key: string; done: boolean }[];
}

export interface AppContextType extends AppState {
  setCoach: (id: string) => Promise<void>;
  setClass: (id: string) => Promise<void>;
  setTimer: (seconds: number) => Promise<void>;
  logEvent: (event: Omit<SessionEvent, 'id' | 'occurred_at'>) => Promise<void>;
  getAudioUrl: (coachId: string, classId: string) => string | null;

  // NEW
  diary: DiaryEntry[];
  addDiaryEntry: (entry: Omit<DiaryEntry, 'id'|'createdAt'>) => Promise<DiaryEntry>;
  rateDiaryEntry: (id: string, rating: Exclude<DiaryRating, null>) => Promise<void>;
  announcements: any[];
  shiftAnnouncement: () => Promise<void>;
  
  // Coach unlock helpers
  getNextCoachUnlock: (currentBest: number) => { milestone: number | null; daysToNext: number | null };
  getNextCoachThreshold: (currentStreak: number) => { threshold: number | null; daysToNext: number | null; coachName: string | null };
  isCoachUnlocked: (bestStreak: number, coach: Coach) => boolean;
  
  // DEV helpers
  devPushAnnouncement?: (type: 'streak_plus' | 'reward_unlocked' | 'coach_unlocked', opts?: { streak?: number; rewardId?: string; coachId?: string; coachName?: string }) => Promise<void>;
  testAnnouncement?: { type: 'streak_plus' | 'reward_unlocked'; streak: number; rewardId?: string } | null;
  devShowTestAnnouncement?: (type: 'streak_plus' | 'reward_unlocked', opts?: { streak?: number; rewardId?: string }) => void;
  devClearTestAnnouncement?: () => void;

  streak: {
    getState: () => Promise<StreakPublicState>;
    onSessionComplete: (opts: { coachName: string; className: string }) => Promise<{ rewardId: string | null }>;
    testIncrementStreak?: () => Promise<void>;
    devSetStreakDays?: (n: number) => Promise<void>;
    devResetStreak?: () => Promise<void>;
  };
} 