import React, { useEffect } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

export function ScreenBackground({
  source,
  fadeMs = 220,
}: {
  source: any;        // require('...')
  fadeMs?: number;
}) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  const onLoad = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: fadeMs,
      useNativeDriver: true,
    }).start();
  };

  // Safety: if load event missed, ensure we fade in anyway
  useEffect(() => {
    const fallback = setTimeout(() => {
      Animated.timing(opacity, { toValue: 1, duration: fadeMs, useNativeDriver: true }).start();
    }, 400);
    return () => clearTimeout(fallback);
  }, [fadeMs, opacity]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
      <ExpoImage
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={0}          // no library crossfade (we control fade)
        cachePolicy="disk"      // use the preloaded disk cache; prevents pop
        onLoad={onLoad}
      />
    </Animated.View>
  );
}
