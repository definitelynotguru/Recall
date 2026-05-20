# Recall — Roadmap plan

Working document for the next development pass. Covers eight priority areas plus two “nice later” items from the May 2026 review.

**Production:** https://recall-aevum-s-projects1.vercel.app  
**Repo:** `definitelynotguru/Recall` (monorepo: `web/`, `android/`)

---

## Current baseline (do not re-build)

| Area | Status |
|------|--------|
| Auth (JWT + refresh cookie, sessionStorage access token) | Done |
| Notes + reminders CRUD, soft delete | Done |
| Sync (`POST /api/v1/sync`, dirty flags on Android) | Done |
| Today timeline, edit/delete reminders (web + Android) | Done |
| Auto Detect Reminder + **Fetch reminders** | Done (web `reminder-detect.ts`, Android `ReminderDetect.kt`) |
| Android: local debounced note save, Sync button, sign-out confirm | Done |
| Web: JSON export on Settings | Partial (export only; no prefs) |
| APK CI on `main` push (`android/**`) | Done (artifact only; release upload manual) |

---

## Implementation phases (recommended order)

```
Phase A — Reliability & release train     (4, 5)
Phase B — Sync visibility                 (1)
Phase C — Web note UX                     (3)
Phase D — Auto-detect quality             (2, 6)
Phase E — Settings & trust UI             (7, 8)
Phase F — Shared logic & web preview      (Nice later 9, 10)
```

Each phase should end with: `npm run build` (web), APK CI green, smoke test on production URL.

---

## 1. End-to-end sync polish

**Problem:** Web creates/edits reminders; Android only schedules alarms after **Sync**. Users miss this and think Recall is broken.

### Tasks

- [ ] **Android — sync state surfaced globally**
  - `AppViewModel`: expose `hasPendingSync: StateFlow<Boolean>` (any dirty note/reminder in Room).
  - `RecallScreenHeader` / bottom area: persistent chip when dirty — “Unsynced changes” + tap → `syncNow()`.
- [ ] **Android — sync after destructive/creative actions**
  - After `addReminder` / `updateReminder` / `deleteReminder` from Fetch reminders flow: optional auto-sync (setting-gated, default ON).
  - After login: keep full sync; show result toast/snackbar.
- [ ] **Web — post-reminder hint**
  - After adding/editing/deleting reminder or Fetch reminders batch: inline banner “Open Recall on your phone and tap **Sync** for notifications.”
- [ ] **Web — optional sync status** (if we add web-side dirty tracking later, skip for v1; banner is enough).

### Files

- `android/.../AppViewModel.kt`, `NotesRepository.kt`, `RecallAppBar.kt` / `RecallScreenHeader`
- `web/src/app/notes/[id]/page.tsx`, `web/src/components/DetectedRemindersDialog.tsx`

### Acceptance

- Create reminder on web → Android shows unsynced indicator within one app open; one Sync schedules alarm.
- No silent failure when sync fails (show `syncHint` error text).

---

## 2. Auto-detect quality

**Problem:** Heuristics are new; need tuning on real notes and fewer false positives.

### Tasks

- [ ] **Fixture notes** — add `web/src/lib/reminder-detect.fixtures.ts` (or `__tests__/reminder-detect.test.ts`) with 15–20 cases:
  - Birthday block (Day/Month/Year/Time) → yearly
  - “22 Oct 2026 at 3pm” + weekly → weekly
  - ISO date only → once @ 09:00
  - False positive guards: version numbers, phone numbers, unrelated years
- [ ] **Dedup window** — tighten `isDuplicateOfExisting` (same calendar day + repeat rule, not only ±1h).
- [ ] **Default time UX** — in `DetectedRemindersDialog`, show “No time found — default 9:00 AM” in reason text when hour inferred.
- [ ] **Confidence / rank** — sort suggestions: title keyword match > structured fields > regex; cap at 5 per fetch.
- [ ] **Mirror fixes** in `android/.../ReminderDetect.kt` (keep in sync manually until Phase F).

### Files

- `web/src/lib/reminder-detect.ts`, `DetectedRemindersDialog.tsx`
- `android/.../ReminderDetect.kt`

### Acceptance

- Fixture tests pass in CI (`npm test` or `vitest` in `web/`).
- “Tanishka's Birthday” + Oct 22 block → one yearly suggestion, not duplicates.

---

## 3. Web note UX — autosave

**Problem:** Web requires explicit **Save**; Fetch reminders calls `save()` but normal typing does not persist.

### Tasks

- [ ] **`useDebouncedNoteSave` hook** — mirror Android: debounce 500–800ms PATCH `/notes/:id`.
- [ ] **Note detail page** — remove reliance on Save for persistence; keep Save as “Saved” indicator or remove button.
- [ ] **Dirty indicator** — subtle “Saving…” / “Saved” near title (monospace, muted).
- [ ] **Flush on unmount** — `beforeunload` + route change send final PATCH.
- [ ] **Fetch reminders** — run against latest in-memory title/body (already true after autosave flush).

### Files

- `web/src/hooks/useDebouncedNoteSave.ts` (new)
- `web/src/app/notes/[id]/page.tsx`

### Acceptance

- Type title/body → reload page within 2s → content restored without clicking Save.
- No PATCH storm (>1 req/s while typing).

---

## 4. Auth / session hardening

**Problem:** 401 on note load after navigation was fixed with sessionStorage; Safari/long sessions may still edge-case.

### Tasks

- [ ] **`apiFetch`** — on 401 after failed refresh: clear sessionStorage token, dispatch event or callback for `AuthProvider` to logout + redirect `/login` with `?reason=session_expired`.
- [ ] **Login page** — show friendly message when `reason=session_expired`.
- [ ] **Refresh cookie** — verify `SameSite=Lax; Secure` on production; document subdomain behavior in README.
- [ ] **Proactive refresh** — optional: refresh access token when `exp` &lt; 5 min (decode JWT client-side without verification, only for scheduling refresh).
- [ ] **RequireAuth** — don’t render children until `authLoading === false` AND (`user` OR redirecting).

### Files

- `web/src/lib/api-client.ts`, `AuthProvider.tsx`, `login/page.tsx`, `RequireAuth.tsx`

### Acceptance

- Revoke refresh server-side → next API call lands on login with message, not infinite skeleton.
- New note → navigate → load works (regression).

---

## 5. CI + releases (APK always matches `main`)

**Problem:** APK workflow uploads artifact; GitHub Release update is manual.

### Tasks

- [ ] **Workflow** — on successful `assemble-debug` for `main`:
  - Bump or use fixed name `recall-1.0.0-debug.apk`
  - Upload to GitHub Release `v1.0.0-debug` (or compute tag from `versionName` in `build.gradle.kts`)
  - Needs `GITHUB_TOKEN` with `contents: write` (default `GITHUB_TOKEN` in Actions)
- [ ] **Copy to `dist/`** — optional commit skip; artifact + release enough.
- [ ] **README** — link to latest release APK URL.
- [ ] **Trigger on web changes?** — No; only `android/**` unless we add a monorepo version file both read.

### Files

- `.github/workflows/build-apk.yml`
- `README.md`, `android/README.md`

### Acceptance

- Push to `main` touching `android/` → Release asset updated within ~10 min.
- Install APK → can log in and sync against production API.

---

## 6. Reminder from title only

**Problem:** Detection uses `title + body` but title-only patterns (e.g. `Dentist — 15 Jun 2026 2pm`) should score high.

### Tasks

- [ ] **Title-first pass** in `detectRemindersInNote` — run `scanDatePatterns(title, title, …)` before body merge.
- [ ] **Separator patterns** — ` - `, ` — `, ` | ` between event name and date.
- [ ] **Label** — use text before separator as reminder label when date after separator.
- [ ] **Android parity** in `ReminderDetect.kt`.

### Files

- `web/src/lib/reminder-detect.ts` (+ fixtures)
- `android/.../ReminderDetect.kt`

### Acceptance

- Note title `Team sync — 21 May 2026 10:00`, empty body → one suggestion.
- Body empty does not block Fetch reminders.

---

## 7. Settings (expand)

**Problem:** Settings only has export + static copy.

### Tasks

- [ ] **User prefs (localStorage, v1)** — no server prefs table yet:
  - `default_reminder_hour` (0–23, default 9)
  - `default_reminder_minute` (0, 30, etc.)
  - `show_sync_hint` (bool, default true)
- [ ] **Apply defaults** in `ReminderDialog`, `DetectedRemindersDialog`, and `reminder-detect` when no time parsed.
- [ ] **Timezone display** — show `Intl.DateTimeFormat().resolvedOptions().timeZone` + note that reminder times are local.
- [ ] **Android Settings screen** (new) — same prefs via `DataStore` or `SharedPreferences`; wire into detect + add-reminder dialogs.
- [ ] **Export** — keep JSON; add optional “copy to clipboard” for small vaults.

### Files

- `web/src/app/settings/page.tsx`, `web/src/lib/user-prefs.ts` (new)
- `web/src/components/ReminderDialog.tsx`, `reminder-detect.ts`
- `android/.../SettingsScreen.kt` (new) + navigation from `MainActivity`

### Acceptance

- Change default time to 8:00 → new Fetch suggestion without time uses 8:00.
- Settings persist across browser refresh.

---

## 8. Onboarding

**Problem:** New users don’t know web vs Android roles.

### Tasks

- [ ] **`localStorage` flag** — `recall_onboarding_done`.
- [ ] **Modal or dedicated `/welcome` route** — 3 steps:
  1. Write notes (Markdown)
  2. **Fetch reminders** or add manually
  3. Install Android APK + **Sync** for notifications
- [ ] **Show once** after first login (in `AuthProvider` or layout wrapper).
- [ ] **Settings link** — “Replay introduction”.
- [ ] **Android** — first-run dialog with same copy (SharedPreferences).

### Files

- `web/src/components/OnboardingDialog.tsx` (new), `AuthProvider.tsx` or `RequireAuth.tsx`
- `android/.../OnboardingDialog.kt` or composable in `MainActivity`

### Acceptance

- Fresh register → onboarding appears once.
- Dismiss → does not reappear; Replay shows again.

---

## 9. Nice later — Shared detection package

**Problem:** `reminder-detect.ts` and `ReminderDetect.kt` will drift.

### Options (pick one in Phase F)

| Option | Pros | Cons |
|--------|------|------|
| A. JSON-driven rules in repo root `shared/reminder-rules.json` | Single source | Both platforms need parsers |
| B. Kotlin library + TS code-gen from tests | Type-safe Android | Heavy tooling |
| C. Keep TS canonical + generate Kotlin via script in CI | Practical | Script maintenance |

### Tasks

- [ ] Document chosen approach in `shared/README.md`.
- [ ] Move fixtures to `shared/fixtures.json`.
- [ ] CI: run TS tests + optional codegen diff check.

### Acceptance

- One fixture file; both platforms pass equivalent outputs for all cases.

---

## 10. Nice later — “Next nudge” preview on web

**Problem:** Web never notifies; users want confidence before Sync.

### Tasks

- [ ] **Today + note detail sidebar** — “Next on phone (after sync)” card:
  - Earliest active reminder for note (or global on Today)
  - Formatted local time + repeat chip
  - Stale hint if `updated_at` &gt; last sync (Android-only metadata; web may approximate from reminder `updated_at` only)
- [ ] **No push** — copy-only preview, not Web Notifications API.

### Files

- `web/src/app/today/page.tsx`, `web/src/app/notes/[id]/page.tsx`
- Optional `web/src/components/NextNudgeCard.tsx`

### Acceptance

- Web shows next upcoming reminder consistent with Today list.
- Clear label: “Delivered on Android after sync.”

---

## Cross-cutting checklist (every phase)

- [ ] `npm run build` passes in `web/`
- [ ] No secrets in git (`.env*.local` gitignored)
- [ ] Production deploy: Vercel project `recall`, root `web/`
- [ ] Manual smoke: login → new note → autosave → Fetch reminders → add → Today shows item
- [ ] Android: Sync → notification fires (or alarm scheduled in logcat)

---

## Out of scope (this plan)

- AI / LLM features
- Web push notifications
- Multi-user sharing
- iOS app
- Calendar app integrations (Google Calendar, etc.)

---

## Progress log

| Date | Phase | Notes |
|------|-------|-------|
| 2026-05-20 | — | Plan created. Auto-detect + edit/delete shipped earlier same day. |

_Update this table as phases complete._
