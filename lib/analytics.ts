// lib/analytics.ts
import { supabase } from './supabase';
import { Platform } from 'react-native';

let currentSessionId: string | null = null;

/** Call once when the app boots (or resumes) */
export function startAnalyticsSession(trigger: 'cold' | 'resume' = 'cold') {
  // new id per app-open
  currentSessionId =
    (global as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  // fire the open event (non-blocking)
  track('app_open', { trigger, platform: Platform.OS }).catch(() => {});
}

/** Universal event logger for the separate analytics stream */
export async function track(
  event_type: string,
  properties: Record<string, any> = {}
) {
  if (!currentSessionId) {
    // if someone calls before startAnalyticsSession, create one
    startAnalyticsSession('cold');
  }

  await supabase.from('app_events').insert([
    {
      session_id: currentSessionId,
      event_type,
      properties,
    },
  ]);
}
