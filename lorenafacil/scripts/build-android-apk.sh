#!/bin/sh
set -eu

MODE="${1:-debug}"
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

cd "$ROOT_DIR"
npm run android:sync

cd android
if [ "$MODE" = "release" ]; then
  ./gradlew assembleRelease
  echo "APK gerado em: android/app/build/outputs/apk/release/app-release-unsigned.apk"
else
  ./gradlew assembleDebug
  echo "APK gerado em: android/app/build/outputs/apk/debug/app-debug.apk"
fi
