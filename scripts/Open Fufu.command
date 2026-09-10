#!/bin/bash

set -u

APP_PATH="/Applications/Fufu.app"
PLIST_PATH="$APP_PATH/Contents/Info.plist"
EXPECTED_BUNDLE_ID="com.fufu.app"

echo "Fufu macOS early-test helper"
echo

if [[ ! -d "$APP_PATH" ]]; then
  echo "Fufu was not found in /Applications."
  echo "Open the DMG and drag Fufu into Applications first."
  echo
  read -r -p "Press Return to close..."
  exit 1
fi

if [[ ! -f "$PLIST_PATH" ]]; then
  echo "This does not look like a complete Fufu installation."
  echo
  read -r -p "Press Return to close..."
  exit 1
fi

BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$PLIST_PATH" 2>/dev/null || true)
if [[ "$BUNDLE_ID" != "$EXPECTED_BUNDLE_ID" ]]; then
  echo "Safety check failed: the app identifier is not $EXPECTED_BUNDLE_ID."
  echo "No changes were made. Download Fufu only from its official GitHub Releases page."
  echo
  read -r -p "Press Return to close..."
  exit 1
fi

echo "Verified $EXPECTED_BUNDLE_ID. Removing Fufu's download quarantine flag..."
if ! /usr/bin/xattr -dr com.apple.quarantine "$APP_PATH"; then
  echo "Could not update Fufu. Make sure it is installed in Applications and try again."
  echo
  read -r -p "Press Return to close..."
  exit 1
fi

echo "Done. Opening Fufu..."
/usr/bin/open "$APP_PATH"
sleep 2
