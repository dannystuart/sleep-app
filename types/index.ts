export interface Coach {
  id: string;
  name: string;
  locale?: string;
  style?: string;
  image_url: string;
  created_at?: string;
}

export interface Class {
  id: string;
  name: string;
  tags: string[];
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

export interface AppContextType extends AppState {
  setCoach: (id: string) => Promise<void>;
  setClass: (id: string) => Promise<void>;
  setTimer: (seconds: number) => Promise<void>;
  logEvent: (event: Omit<SessionEvent, 'id' | 'occurred_at'>) => Promise<void>;
  getAudioUrl: (coachId: string, classId: string) => string | null;
} 