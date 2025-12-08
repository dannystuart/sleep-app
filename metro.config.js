// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Note: We do NOT redirect react-native-track-player here
// The trackPlayerSafe.ts wrapper handles fallback for Expo Go at runtime

module.exports = config;
