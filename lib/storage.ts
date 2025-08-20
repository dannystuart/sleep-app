import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  coachId: '@theta/coachId',
  classId: '@theta/classId',
  timerSeconds: '@theta/timerSeconds',
  streak: '@theta/streak',
  diary: '@theta/diary',
  announcements: '@theta/announcements',
  hasOnboarded: '@theta/hasOnboarded',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;

export async function getStorageItem(key: StorageKey): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS[key]);
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return null;
  }
}

export async function setStorageItem(key: StorageKey, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS[key], value);
  } catch (error) {
    console.error(`Error writing ${key} to storage:`, error);
  }
}

export async function removeStorageItem(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS[key]);
  } catch (error) {
    console.error(`Error removing ${key} from storage:`, error);
  }
} 