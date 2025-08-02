import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
}

export function SafeAreaView({ children, style }: Props) {
  return (
    <RNSafeAreaView style={[styles.container, style]} forceInset={{ top: 'always' }}>
      {children}
    </RNSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});