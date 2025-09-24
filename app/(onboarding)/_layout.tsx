import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { Asset } from 'expo-asset';

const BG_ASSETS = [
  require('../../assets/images/THETA-BG-TRANS.png'),
  require('../../assets/images/onboarding/onboarding-gradient.png'),
  require('../../assets/images/onboarding/onboarding-moon.png'),
  require('../../assets/images/onboarding/onboarding-sun.png'),
  require('../../assets/images/onboarding/onboarding-streak.png'),
  require('../../assets/images/THETA-BG.png'), // Sleep session background
  // Add any other per-screen BGs here
];

export default function OnboardingLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { 
        await Asset.loadAsync(BG_ASSETS); 
        console.log('✅ Onboarding background assets preloaded');
      } catch (error) {
        console.error('❌ Error preloading background assets:', error);
      } finally { 
        if (alive) setReady(true); 
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!ready) return null; // wait until BGs are cached on disk

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
        freezeOnBlur: true,          // freeze outgoing repaint
        detachPreviousScreen: true,  // detach ASAP to reduce overlap
      }}
    />
  );
}
