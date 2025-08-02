import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PlayButtonProps {
  onPress?: () => void;
}

const PlayButton: React.FC<PlayButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <LinearGradient
        colors={['#B3ACE9', '#5B45DD']} // Outer stroke
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.outerCircle}
      >
        <LinearGradient
          colors={['#794BD6', '#585ED2']} // Faux-radial fill (center to edge)
          start={{ x: 0, y: 1 }}
end={{ x: 1, y: 0 }}
          style={styles.innerCircle}
        >
          
            <Image 
              source={require('../assets/images/play-btn-icon.png')}
              style={styles.playIcon}
            />
          <View style={styles.playTriangle} />

          
        </LinearGradient>
      </LinearGradient>
    </TouchableOpacity>
  );
}; 

const styles = StyleSheet.create({
  outerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 2, // Stroke thickness
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#3e2d86', // Inner background (adjust as needed)
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 20,
    height: 20,
   resizeMode: 'contain',
  },
});

export default PlayButton; 