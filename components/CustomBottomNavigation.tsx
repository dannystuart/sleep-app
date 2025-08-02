import React, { useMemo, useState, useCallback, memo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface TabItem {
  name: string;
  route: string;
  iconName: 'play' | 'diary' | 'settings';
}

const tabs: TabItem[] = [
  {
    name: 'Play',
    route: '/',
    iconName: 'play',
  },
  {
    name: 'Diary',
    route: '/diary',
    iconName: 'diary',
  },
  {
    name: 'Settings',
    route: '/settings',
    iconName: 'settings',
  },
];

// Memoized icon component to prevent unnecessary re-renders
const IconComponent = memo(({ iconName, color }: { iconName: string; color: string }) => {
  switch (iconName) {
    case 'play':
      return (
        <Svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <Path d="M15.9993 29.3334C23.3631 29.3334 29.3327 23.3639 29.3327 16.0001C29.3327 8.63628 23.3631 2.66675 15.9993 2.66675C8.63555 2.66675 2.66602 8.63628 2.66602 16.0001C2.66602 23.3639 8.63555 29.3334 15.9993 29.3334Z" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M13.3337 10.667L21.3337 16.0003L13.3337 21.3337V10.667Z" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'diary':
      return (
        <Svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <Path d="M2.66675 8H8.00008" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M2.66675 13.3333H8.00008" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M2.66675 18.6667H8.00008" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M2.66675 24H8.00008" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M23.9999 2.66675H7.99992C6.52716 2.66675 5.33325 3.86066 5.33325 5.33341V26.6667C5.33325 28.1395 6.52716 29.3334 7.99992 29.3334H23.9999C25.4727 29.3334 26.6666 28.1395 26.6666 26.6667V5.33341C26.6666 3.86066 25.4727 2.66675 23.9999 2.66675Z" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M21.3333 2.66675V29.3334" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'settings':
      return (
        <Svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <Path d="M18.666 22.667H6.66602" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M25.3342 9.33252H13.3342" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M22.666 26.667C24.8752 26.667 26.666 24.8761 26.666 22.667C26.666 20.4579 24.8752 18.667 22.666 18.667C20.4569 18.667 18.666 20.4579 18.666 22.667C18.666 24.8761 20.4569 26.667 22.666 26.667Z" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M9.33398 13.3325C11.5431 13.3325 13.334 11.5417 13.334 9.33252C13.334 7.12338 11.5431 5.33252 9.33398 5.33252C7.12485 5.33252 5.33398 7.12338 5.33398 9.33252C5.33398 11.5417 7.12485 13.3325 9.33398 13.3325Z" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    default:
      return null;
  }
});

// Memoized tab item component
const TabItem = memo(({ tab, isActive, onPress }: { 
  tab: TabItem; 
  isActive: boolean; 
  onPress: (route: string) => void;
}) => {
  const color = isActive ? '#F69197' : 'white';
  
  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={() => onPress(tab.route)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <IconComponent iconName={tab.iconName} color={color} />
      </View>
    </TouchableOpacity>
  );
});

export default function CustomBottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  // Memoize the active state to prevent unnecessary re-renders
  const activeTab = useMemo(() => {
    return tabs.find(tab => tab.route === pathname)?.route || '/';
  }, [pathname]);

  const handleTabPress = useCallback((route: string) => {
    // Prevent unnecessary navigation if already on the same tab
    if (route === activeTab) return;
    
    router.push(route as any);
  }, [activeTab, router]);

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            isActive={tab.route === activeTab}
            onPress={handleTabPress}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 24,
    height: 64,
    maxWidth: 280,
    width: '100%',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    height: '100%',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 26,
    height: 26,
  },
});