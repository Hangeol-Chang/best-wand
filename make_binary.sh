#!/usr/bin/env bash
# PC(웹) 빌드 + 안드로이드 빌드를 한 번에 만드는 스크립트. 버전 관리도 여기서 함.
#
# 사용법:
#   ./make_binary.sh                → 현재 버전 그대로 빌드
#   ./make_binary.sh --version 0.0.1 → package.json 버전에 0.0.1을 더한 뒤 빌드
#
# 필요 환경: Node/npm, Android SDK(ANDROID_HOME), JDK(JAVA_HOME) — 안드로이드 빌드용.
set -euo pipefail
cd "$(dirname "$0")"

BUMP=""
while [ $# -gt 0 ]; do
  case "$1" in
    --version)
      BUMP="$2"
      shift 2
      ;;
    *)
      echo "알 수 없는 옵션: $1" >&2
      exit 1
      ;;
  esac
done

CURRENT_VERSION=$(node -p "require('./package.json').version")

if [ -n "$BUMP" ]; then
  NEW_VERSION=$(node -e "
    const [a,b] = ['$CURRENT_VERSION', '$BUMP'].map(v => v.split('.').map(Number));
    console.log(a.map((n,i) => n + (b[i] || 0)).join('.'));
  ")
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  VERSION="$NEW_VERSION"
  echo "버전 갱신: $CURRENT_VERSION -> $VERSION"
else
  VERSION="$CURRENT_VERSION"
  echo "버전 유지: $VERSION"
fi

echo "==> 웹 빌드"
npm run build

OUT_DIR="builds"
mkdir -p "$OUT_DIR"

WEB_OUT="$OUT_DIR/web-v$VERSION"
rm -rf "$WEB_OUT"
cp -r dist "$WEB_OUT"
echo "웹 빌드 결과: $WEB_OUT"

if [ -d android ]; then
  echo "==> 안드로이드 동기화"
  npx cap sync android

  CURRENT_CODE=$(grep -oE 'versionCode [0-9]+' android/app/build.gradle | grep -oE '[0-9]+')
  NEW_CODE=$((CURRENT_CODE + 1))
  sed -i "s/versionCode $CURRENT_CODE/versionCode $NEW_CODE/" android/app/build.gradle
  sed -i "s/versionName \"[^\"]*\"/versionName \"$VERSION\"/" android/app/build.gradle

  echo "==> 안드로이드 빌드 (versionCode $NEW_CODE, versionName $VERSION)"
  (cd android && ./gradlew.bat assembleDebug --console=plain)

  APK_SRC="android/app/build/outputs/apk/debug/app-debug.apk"
  APK_OUT="$OUT_DIR/best-wand-v$VERSION.apk"
  cp "$APK_SRC" "$APK_OUT"
  echo "안드로이드 빌드 결과: $APK_OUT"
else
  echo "android/ 폴더 없음 — 안드로이드 빌드 건너뜀"
fi

echo "==> 완료 (버전 $VERSION)"
