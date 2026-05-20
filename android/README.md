# Recall — Android

Kotlin + Jetpack Compose client. **All reminders fire as local notifications here** — the web app only edits data.

## Setup

1. Open this folder in Android Studio.
2. Create `local.properties` (see `local.properties.example`).
3. Point `API_BASE_URL` at your Recall web API (emulator: `http://10.0.2.2:3000/api/v1`).

## Key components

| Piece | Role |
|-------|------|
| `SyncRepository` | `POST /api/v1/sync`, merge Room |
| `ReminderReconciler` | Schedule/cancel `AlarmManager` alarms |
| `ReminderReceiver` | Show notification, Done, Snooze |
| `BootReceiver` | Re-schedule after reboot |
| `TokenStore` | EncryptedSharedPreferences for JWT |

## Build an APK

### GitHub Actions (no Android Studio required)

Every push to `android/` on `main` builds a debug APK. You can also run it manually:

1. GitHub → **Actions** → **Build Recall APK** → **Run workflow**
2. Optional: set `api_base_url` to your deployed API (e.g. `https://recall-aevum-s-projects1.vercel.app/api/v1`)
3. Download **recall-debug-apk** from the run’s **Artifacts**

### Local (Android Studio)

```bash
cd android
cp local.properties.example local.properties
# Edit API_BASE_URL for a physical device (your LAN IP or production URL)
./gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

Install on a device: enable “Install unknown apps”, then `adb install -r app-debug.apk`.

**MIUI / Redmi:** If the package installer crashes, use the latest APK from Actions (icons + manifest fixes). Try **Files** app or `adb install -r` instead of the stock installer.

### Regenerate launcher icons

```bash
RECALL_LOGO_ASSETS=/path/to/recall_logo_assets ./scripts/generate-icons.sh
```

Source SVGs are also in `android/branding/`.

## Permissions

Notifications, exact alarms (where granted), boot completed, internet.

See [root README](../README.md) for the full stack and testing checklist.
