# Testing checklist

Run with web (`cd web && npm run dev`) and Android app pointed at dev API.

## Automated

```bash
cd web && npm test          # reminder detect + sync merge LWW
cd android && ./gradlew :app:testDebugUnitTest   # token refresh policy
```

## Sync (online)

1. **Web → Android sync:** Create note on web → open Android, pull to refresh → note appears.
2. **Web reminder → Android notify:** Add reminder on web → sync Android → notification at correct local time.
3. **Complete from notification:** Fire reminder → tap Done → web shows completed (after sync).
4. **Reboot:** Reboot device → reminders still scheduled (`BootReceiver`).
5. **Delete propagation:** Delete note on web → sync Android → alarms cancelled.
6. **Yearly repeat:** Yearly reminder fires → `fire_at` advances on server after complete.
7. **Token refresh:** Wait 15+ min or invalidate access token → background sync still works via refresh (within 90 days).

## Offline (Android)

Use airplane mode or disable Wi‑Fi/mobile data. You should see:

> You're out of Internet. Sync will not take action till you are back online.

8. **Stay signed in:** Airplane mode → open app, browse notes, force-stop and reopen → still on main shell (not login).
9. **No false logout:** Airplane mode → pull to refresh or wait for periodic sync → still logged in; tokens must not be cleared.
10. **Android offline → web:** Airplane mode → create note titled `Offline test` with unique body → turn network on → wait for auto-sync or tap Sync → refresh web Notes → note visible.
11. **Web → Android after offline:** Create note on web while Android is offline → restore network on Android → auto-sync or tap Sync → note appears in Android list.
12. **Unsynced chip:** While offline after editing, header shows “Unsynced changes · tap Sync”; sync runs after reconnect.

## curl smoke test (API)

```bash
BASE=http://localhost:3000/api/v1
# Register
curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"twelvecharpass","register_secret":"YOUR_SECRET"}'

# Login (save access_token)
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"twelvecharpass"}'
```
