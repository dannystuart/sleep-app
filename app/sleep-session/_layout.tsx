import React from 'react';
import { Stack } from 'expo-router';

export default function SessionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'fullScreenModal',   // modal covers notch + home bar
        animation: 'slide_from_bottom',    // ⬆️ slide up, ⬇️ slide down
        contentStyle: { backgroundColor: '#000' }, // Match component background
        freezeOnBlur: true,
      }}
    />
  );
}
