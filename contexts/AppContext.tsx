import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { AppContextType, AppState, Coach, Class, SessionAudio, SessionEvent } from '../types';

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

      // 2. Load stored selections
      const [storedCoachId, storedClassId, storedTimer] = await Promise.all([
        getStorageItem('coachId'),
        getStorageItem('classId'),
        getStorageItem('timerSeconds'),
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