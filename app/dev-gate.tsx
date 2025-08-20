import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { setStorageItem, removeStorageItem, STORAGE_KEYS } from '../lib/storage';

export default function DevGate() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../assets/images/THETA-BG.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={styles.center}>
        <Text style={styles.title}>Onboarding Dev Gate</Text>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#794BD6' }]}
          onPress={async () => {
            try {
              console.log('🔄 Clearing onboarding flag...');
              await setStorageItem('hasOnboarded', '');
              console.log('✅ Flag cleared, navigating to onboarding...');
              router.replace('/onboarding');
            } catch (error) {
              console.error('❌ Error clearing onboarding flag:', error);
              // Fallback: just navigate to onboarding
              router.replace('/onboarding');
            }
          }}
        >
          <Text style={styles.btnText}>Run onboarding</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#2e2e2e' }]}
          onPress={async () => {
            try {
              await setStorageItem('hasOnboarded', '1');
              router.replace('/');
            } catch (error) {
              console.error('Error setting onboarding flag:', error);
              // Fallback: just navigate to home
              router.replace('/');
            }
          }}
        >
          <Text style={styles.btnText}>Skip to home</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  title: { color: 'white', fontSize: 18, marginBottom: 12 },
  btn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: 'white', fontSize: 16 },
});
