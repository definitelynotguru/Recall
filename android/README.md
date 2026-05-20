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

## Permissions

Notifications, exact alarms (where granted), boot completed, internet.

See [root README](../README.md) for the full stack and testing checklist.
