# Testing checklist

Run with web (`cd web && npm run dev`) and Android app pointed at dev API.

1. **Web → Android sync:** Create note on web → open Android, pull to refresh → note appears.
2. **Web reminder → Android notify:** Add reminder on web → sync Android → notification at correct local time.
3. **Android offline create:** Airplane mode → create note on Android → go online → sync → visible on web.
4. **Complete from notification:** Fire reminder → tap Done → web shows completed (after sync).
5. **Reboot:** Reboot device → reminders still scheduled (`BootReceiver`).
6. **Delete propagation:** Delete note on web → sync Android → alarms cancelled.
7. **Yearly repeat:** Yearly reminder fires → `fire_at` advances on server after complete.
8. **Token refresh:** Wait 15+ min or invalidate access token → background sync still works via refresh (within 90 days).

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
