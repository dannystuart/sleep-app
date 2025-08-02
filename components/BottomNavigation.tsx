import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface TabIconProps {
  focused: boolean;
  iconName: 'play' | 'diary' | 'settings';
}

const TabIcon: React.FC<TabIconProps> = ({ focused, iconName }) => {
  const getIconPath = () => {
    const color = focused ? '#B9A8E5' : 'white';
    
    switch (iconName) {
      case 'play':
        return (
          <Svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <Path d="M15.9993 29.3334C23.3631 29.3334 29.3327 23.3639 29.3327 16.0001C29.3327 8.63628 23.3631 2.66675 15.9993 2.66675C8.63555 2.66675 2.66602 8.63628 2.66602 16.0001C2.66602 23.3639 8.63555 29.3334 15.9993 29.3334Z" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M13.3337 10.667L21.3337 16.0003L13.3337 21.3337V10.667Z" stroke={color} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        );
      case 'diary':
        return (
          <Svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <Path d="M8 4H24C25.1046 4 26 4.89543 26 6V26C26 27.1046 25.1046 28 24 28H8C6.89543 28 6 27.1046 6 26V6C6 4.89543 6.89543 4 8 4Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M10 10H22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M10 16H22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M10 22H16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        );
      case 'settings':
        return (
          <Svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <Path d="M16 20C18.2091 20 20 18.2091 20 16C20 13.7909 18.2091 12 16 12C13.7909 12 12 13.7909 12 16C12 18.2091 13.7909 20 16 20Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M27.2 16C27.2 15.2 26.8 14.4 26.4 13.8L28.8 11.4C29.2 11 29.2 10.4 28.8 10L26.4 7.6C26 7.2 25.4 7.2 25 7.6L22.6 10C22 9.6 21.2 9.2 20.4 9.2H19.6C19.2 9.2 18.8 8.8 18.8 8.4V6.8C18.8 6.4 18.4 6 18 6H14C13.6 6 13.2 6.4 13.2 6.8V8.4C13.2 8.8 12.8 9.2 12.4 9.2H11.6C10.8 9.2 10 9.6 9.4 10L7 7.6C6.6 7.2 6 7.2 5.6 7.6L3.2 10C2.8 10.4 2.8 11 3.2 11.4L5.6 13.8C5.2 14.4 4.8 15.2 4.8 16C4.8 16.8 5.2 17.6 5.6 18.2L3.2 20.6C2.8 21 2.8 21.6 3.2 22L5.6 24.4C6 24.8 6.6 24.8 7 24.4L9.4 22C10 22.4 10.8 22.8 11.6 22.8H12.4C12.8 22.8 13.2 23.2 13.2 23.6V25.2C13.2 25.6 13.6 26 14 26H18C18.4 26 18.8 25.6 18.8 25.2V23.6C18.8 23.2 19.2 22.8 19.6 22.8H20.4C21.2 22.8 22 22.4 22.6 22L25 24.4C25.4 24.8 26 24.8 26.4 24.4L28.8 22C29.2 21.6 29.2 21 28.8 20.6L26.4 18.2C26.8 17.6 27.2 16.8 27.2 16Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        );
      default:
        return null;
    }
  };

  return (
    <View style={iconStyles.container}>
      {getIconPath()}
    </View>
  );
};

const iconStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const getTabBarOptions = () => ({
  headerShown: false,
  tabBarStyle: {
    position: 'absolute' as const,
    bottom: 32,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 24,
    borderTopWidth: 0,
    paddingBottom: 0,
    paddingTop: 0,
    marginHorizontal: 'auto' as const,
    maxWidth: 280,
    alignSelf: 'center' as const,
  },
  tabBarActiveTintColor: '#B9A8E5',
  tabBarInactiveTintColor: 'white',
  tabBarShowLabel: false,
  tabBarItemStyle: {
  flex: 'auto', // This makes the icon fill the item space vertically
  justifyContent: 'center',
  alignItems: 'center',
  height: 64,
  paddingTop: 0,
  paddingBottom: 0,
  paddingHorizontal: 0,
},
});

export const getTabScreenOptions = () => ({
  index: {
    title: 'Play',
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <TabIcon 
        focused={focused} 
        iconName="play"
      />
    ),
  },
  diary: {
    title: 'Diary',
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <TabIcon 
        focused={focused} 
        iconName="diary"
      />
    ),
  },
  settings: {
    title: 'Settings',
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <TabIcon 
        focused={focused} 
        iconName="settings"
      />
    ),
  },
});