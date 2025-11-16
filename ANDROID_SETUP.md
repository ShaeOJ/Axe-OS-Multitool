# Android Setup Guide for Axe-OS Multitool

This guide will help you build the Axe-OS Multitool app for Android devices.

## Prerequisites

### 1. Install Android Studio

Download and install Android Studio from: https://developer.android.com/studio

During installation, make sure to select:
- ✅ Android SDK
- ✅ Android SDK Platform
- ✅ Android Virtual Device

### 2. Install Java Development Kit (JDK 17+)

**Option A: Download directly**
- Download from: https://adoptium.net/
- Install JDK 17 or newer

**Option B: Use Chocolatey (Windows)**
```powershell
choco install temurin17
```

### 3. Set Environment Variables

**Windows:**

1. Open "Edit the system environment variables" from Start menu
2. Click "Environment Variables" button
3. Add these System Variables:

```
Variable: ANDROID_HOME
Value: C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk

Variable: JAVA_HOME
Value: C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot
```

4. Edit the `Path` variable and add:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\cmdline-tools\latest\bin
%ANDROID_HOME%\emulator
```

5. **Restart your terminal/PowerShell** for changes to take effect

### 4. Install Android SDK Components

Open Android Studio:
1. Go to: Tools → SDK Manager
2. In "SDK Platforms" tab, install:
   - ✅ Android 13.0 (Tiramisu) - API Level 33
   - ✅ Android 12.0 (S) - API Level 31

3. In "SDK Tools" tab, install:
   - ✅ Android SDK Build-Tools (latest)
   - ✅ Android SDK Command-line Tools
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator
   - ✅ NDK (Side by side) - version 25.x or newer

4. Click "Apply" and wait for installation to complete

---

## Initialize Android Project

Once prerequisites are installed, run:

```bash
# Verify environment variables are set
echo $env:ANDROID_HOME
echo $env:JAVA_HOME

# Initialize Android support
npm run tauri android init
```

This will create:
- `src-tauri/gen/android/` - Android project files
- Android manifest and Gradle configurations

---

## Configure Android Permissions

After initialization, the Android manifest will be created automatically. You may need to verify these permissions are present:

**File:** `src-tauri/gen/android/app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Network permissions for connecting to miners -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

    <application
        android:label="AxeOS Live!"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:allowBackup="true"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.AppCompat.DayNight.NoActionBar">

        <!-- Activity configuration will be auto-generated -->

    </application>
</manifest>
```

**Important:** `android:usesCleartextTraffic="true"` allows HTTP connections to local miners.

---

## Build for Android

### Development Build (APK for Testing)

```bash
# Build and run on connected device or emulator
npm run tauri android dev
```

This will:
1. Build the Next.js frontend
2. Compile the Rust backend for Android
3. Launch the app on your device/emulator

### Release Build (For Distribution)

```bash
# Build production APK and AAB
npm run tauri android build
```

**Output files:**
- **APK:** `src-tauri/gen/android/app/build/outputs/apk/release/app-release-unsigned.apk`
- **AAB:** `src-tauri/gen/android/app/build/outputs/bundle/release/app-release.aab` (for Play Store)

---

## Testing on Android Emulator

### Create Virtual Device

1. Open Android Studio
2. Go to: Tools → Device Manager
3. Click "Create Device"
4. Select a phone (e.g., Pixel 6)
5. Select system image: API 33 (Android 13)
6. Click "Finish"

### Run on Emulator

```bash
# Start emulator (if not already running)
# Then run dev build
npm run tauri android dev
```

---

## Testing on Physical Device

### Enable Developer Mode

1. On your Android device: Settings → About Phone
2. Tap "Build Number" 7 times
3. Go back to Settings → Developer Options
4. Enable "USB Debugging"

### Connect Device

1. Connect via USB cable
2. Accept "Allow USB Debugging" prompt on device
3. Verify connection:
   ```bash
   adb devices
   ```

4. Run app:
   ```bash
   npm run tauri android dev
   ```

---

## Signing the APK (For Release)

To distribute your app, you need to sign it:

### Generate Keystore

```bash
keytool -genkey -v -keystore axeos-release.keystore -alias axeos -keyalg RSA -keysize 2048 -validity 10000
```

### Sign APK

```bash
# Sign the APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore axeos-release.keystore app-release-unsigned.apk axeos

# Verify signature
jarsigner -verify -verbose -certs app-release-unsigned.apk

# Align the APK (optimize for installation)
zipalign -v 4 app-release-unsigned.apk AxeOS-Live-v1.0.0.apk
```

---

## Troubleshooting

### "ANDROID_HOME not set" Error

Make sure you:
1. Set the environment variable correctly
2. **Restarted your terminal**
3. The path points to the correct SDK location

Verify with:
```bash
echo $env:ANDROID_HOME  # PowerShell
echo %ANDROID_HOME%     # CMD
```

### "NDK not found" Error

Install NDK from Android Studio:
1. Tools → SDK Manager
2. SDK Tools tab
3. Check "NDK (Side by side)"
4. Click Apply

### App crashes on startup

Check logcat for errors:
```bash
adb logcat | grep -i error
```

### Network requests fail

Make sure `android:usesCleartextTraffic="true"` is in your AndroidManifest.xml

---

## Mobile-Specific Features

The app already includes mobile optimizations:

✅ **Responsive Layout**
- Miner cards stack vertically on mobile
- Touch-optimized button sizes
- Mobile-specific header layout

✅ **Platform Detection**
- Uses `useIsMobile()` hook
- Automatically adjusts UI for screen size

✅ **Network Access**
- Configured for local network access
- HTTP support for miner connections

---

## Next Steps

1. **Install Android Studio and SDK** (see Prerequisites above)
2. **Set environment variables** and restart terminal
3. **Run:** `npm run tauri android init`
4. **Test on emulator:** `npm run tauri android dev`
5. **Build release:** `npm run tauri android build`

---

## Additional Resources

- Tauri Android Docs: https://v2.tauri.app/develop/
- Android Developer Guide: https://developer.android.com/
- Tauri Discord: https://discord.gg/tauri

---

## Known Limitations

⚠️ **Android-specific considerations:**

1. **Background Processing:** Android limits background tasks. Auto-refresh may pause when app is backgrounded.
2. **Battery Optimization:** Frequent polling (every 15s) may drain battery faster on mobile.
3. **Network Discovery:** Android restricts local network scanning. Users must manually enter miner IPs.
4. **Permissions:** Network access requires appropriate manifest permissions (already configured).

---

**Need help?** Check the troubleshooting section or open an issue on GitHub.
