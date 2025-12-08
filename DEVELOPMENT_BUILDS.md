# Development Builds Guide

This guide explains how to use Development Builds for local testing without paying for EAS cloud builds.

## What are Development Builds?

A Development Build is a custom version of the "Expo Go" app that is specific to your project. It includes all your native libraries (which is why standard Expo Go fails for this project).

**The Magic**: You build this app **once** and install it on your phone. After that, you simply run a local server (`npx expo start --dev-client`), and the app loads your latest code instantly. You do **not** need to rebuild the app binary for every JavaScript/Cursor change.

## Prerequisites

- **For iOS**: Mac with Xcode installed from the App Store (required - Command Line Tools alone are not sufficient)
- **For Android**: PC/Mac with Android Studio installed
- Physical device connected via USB (recommended) OR simulator/emulator

## Setup Instructions

### Step 1: Verify expo-dev-client is Installed

The `expo-dev-client` package is already installed in this project. If you need to reinstall:

```bash
npx expo install expo-dev-client
```

### Step 2: Build the Development Client (One-Time Setup)

#### For iOS:

**⚠️ Important: Xcode Installation Required**

If you see errors like `SDK "iphoneos" cannot be located` or `tool 'xcodebuild' requires Xcode`, you need to:

1. **Install Xcode from the App Store** (free, but large ~15GB download)
   - Open App Store on your Mac
   - Search for "Xcode"
   - Click "Get" or "Install"
   - Wait for download/installation (can take 30-60 minutes)

2. **Open Xcode at least once** to accept the license agreement:
   ```bash
   open /Applications/Xcode.app
   ```
   - Accept the license if prompted
   - Let it complete installation of additional components

3. **Set Xcode as the active developer directory**:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   ```

4. **Verify Xcode is working**:
   ```bash
   xcodebuild -version
   xcrun --show-sdk-path --sdk iphoneos
   ```

**For Device Build (Physical iPhone):**
```bash
npx expo run:ios --device
```

This will:
- Ask you to select your Team (free Apple ID works for 7-day provisioning)
- Build the app on your local machine
- Install the app on your connected iPhone

**Alternative: Simulator Build (No Device Needed)**
If you don't have a physical device or want to test quickly:
```bash
npx expo run:ios
```
This builds and runs in the iOS Simulator (no device connection needed)

#### For Android:

```bash
npx expo run:android --device
```

This will:
- Build the app on your local machine
- Install the app on your connected Android device

**Note**: The first build may take 10-20 minutes. Subsequent builds (when needed) are much faster.

### Step 3: Start the Development Server

Once the app is installed on your phone, **stop the terminal process** from Step 2, and run:

```bash
npm run dev
```

Or if you want to clear the cache:

```bash
npm run dev:clear
```

This starts the development server with the dev client enabled.

### Step 4: Connect to the Development Server

1. Open the development build app on your phone (it will have your app's name/icon)
2. Scan the QR code displayed in the terminal
3. Your app will load with your latest code

**That's it!** Now when you make changes in Cursor:
- Just save the file
- Your phone updates **instantly** with Hot Reload
- No payment, no waiting, no rebuild needed

## When Do You Need to Rebuild?

You only need to run the build command (Step 2) again if:

1. **You install a new native library** (e.g., `npx expo install expo-camera`)
2. **You change app.json** (e.g., changing the app icon, permissions, or name)
3. **You modify native code** (iOS/Android native files)

For **99% of your changes** (UI, logic, API calls, TypeScript/JavaScript), you just keep the server running and hit save. The changes appear instantly on your device.

## Alternative: EAS Local Build (For Installable Files)

If you specifically want the installable file (like an APK or IPA) but don't want to pay Expo's cloud servers, you can use your own computer's CPU to do the "EAS Build".

### iOS Local Build:

```bash
npm run build:ios:local
```

This produces an `.ipa` file that you can install on your device.

### Android Local Build:

```bash
npm run build:android:local
```

This produces an `.apk` file that you can install on your device.

## Troubleshooting

### Build Fails on iOS

- **"SDK iphoneos cannot be located"**: 
  - Install full Xcode from App Store (not just Command Line Tools)
  - Open Xcode once to accept license
  - Run: `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`
  - Verify with: `xcodebuild -version`
  
- **Team Selection**: If prompted, select your Apple ID (free accounts work for 7 days)
- **Device Trust**: Make sure you've trusted the computer on your iPhone (Settings > General > VPN & Device Management)
- **Xcode Version**: Ensure you have Xcode 14+ installed (check with `xcodebuild -version`)

### Build Fails on Android

- **ADB Connection**: Verify your device is connected with `adb devices`
- **USB Debugging**: Enable USB debugging on your Android device (Settings > Developer Options)
- **SDK Version**: Ensure Android SDK is properly configured in Android Studio

### App Won't Connect to Dev Server

- **Same Network**: Make sure your phone and computer are on the same Wi-Fi network
- **Firewall**: Check if your firewall is blocking the connection
- **Port**: The default port is 8081 - ensure it's not blocked

### Changes Not Reflecting

- **Clear Cache**: Run `npm run dev:clear` to clear Metro bundler cache
- **Restart Server**: Stop and restart the dev server
- **Reload App**: Shake your device and tap "Reload" (iOS) or press `r` in terminal (Android)

## Workflow Summary

1. **Initial Setup** (Once): Build and install the development client on your device
2. **Daily Development** (Repeated):
   - Run `npm run dev`
   - Scan QR code
   - Make changes and save
   - See updates instantly on your device
3. **Rebuild** (Only when needed): After installing native dependencies or changing app.json

## Cost Savings

- **Before**: $2 per build × multiple builds per day = $$$
- **After**: Build once locally for free, then develop for free forever

## Additional Resources

- [Expo Development Builds Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
- [Local Development Workflow](https://docs.expo.dev/develop/development-builds/create-a-build/)
- [EAS Local Builds](https://docs.expo.dev/build/eas-builds/#local-builds)

