package com.notesreminders.app.debug

import android.os.Build
import com.notesreminders.app.BuildConfig
import com.notesreminders.app.NotesApp
import com.notesreminders.app.data.api.DebugReportRequest
import com.notesreminders.app.reminders.AlarmRegistry
import com.notesreminders.app.reminders.ReminderDiagnostics
import com.notesreminders.app.sync.SyncDiagnostics
import kotlinx.coroutines.runBlocking
import java.time.Instant

object DebugReportCollector {
    fun collect(app: NotesApp, lastSyncHint: String?): DebugReportRequest {
        val ctx = app.applicationContext
        val dirtyNotes = runBlocking { app.database.noteDao().getDirty() }
        val dirtyReminders = runBlocking { app.database.reminderDao().getDirty() }
        val activeReminders = runBlocking { app.database.reminderDao().getActive() }
        val activeNotes = runBlocking { app.database.noteDao().getActive() }
        val alarmRegistry = runBlocking { AlarmRegistry(ctx).load() }
        val syncMeta = runBlocking { app.database.syncMetaDao().get() }
        val now = Instant.now()

        val upcoming = activeReminders
            .mapNotNull { r ->
                runCatching {
                    val fire = Instant.parse(r.fireAt)
                    r to fire
                }.getOrNull()
            }
            .sortedBy { it.second }
            .take(15)
            .map { (r, fire) ->
                mapOf(
                    "id" to r.id.take(8),
                    "note_id" to r.noteId.take(8),
                    "fire_at" to r.fireAt,
                    "seconds_until" to (fire.epochSecond - now.epochSecond),
                    "status" to r.status,
                    "repeat_rule" to r.repeatRule,
                    "in_alarm_registry" to alarmRegistry.containsKey(r.id),
                )
            }

        val payload = mutableMapOf<String, Any?>(
            "platform" to "android",
            "collected_at" to now.toString(),
            "device" to mapOf(
                "manufacturer" to Build.MANUFACTURER,
                "model" to Build.MODEL,
                "sdk_int" to Build.VERSION.SDK_INT,
                "release" to Build.VERSION.RELEASE,
            ),
            "auth" to mapOf(
                "logged_in" to app.tokenStore.isLoggedIn(),
                "user_id" to app.tokenStore.userId?.take(8),
            ),
            "network" to app.networkMonitor.snapshot(),
            "environment" to EnvironmentDiagnostics.collect(ctx),
            "last_sync_hint" to lastSyncHint,
            "last_sync_error" to SyncDiagnostics.lastError,
            "sanitize_warnings" to SyncDiagnostics.lastWarnings,
            "sync_meta" to mapOf(
                "device_id" to syncMeta?.deviceId?.take(8),
                "last_sync_at" to syncMeta?.lastSyncAt,
            ),
            "sync" to mapOf(
                "dirty_note_count" to dirtyNotes.size,
                "dirty_reminder_count" to dirtyReminders.size,
                "active_note_count" to activeNotes.size,
                "active_reminder_count" to activeReminders.size,
                "last_sent_note_count" to SyncDiagnostics.lastSanitizedNoteCount,
                "last_sent_reminder_count" to SyncDiagnostics.lastSanitizedReminderCount,
            ),
            "reminders" to mapOf(
                "diagnostics" to mapOf(
                    "last_reconcile_at" to ReminderDiagnostics.lastReconcileAt,
                    "active_count" to ReminderDiagnostics.activeReminderCount,
                    "registry_alarm_count" to ReminderDiagnostics.scheduledAlarmCount,
                    "skipped_past" to ReminderDiagnostics.skippedPastCount,
                    "advanced_repeat" to ReminderDiagnostics.advancedRepeatCount,
                    "can_schedule_exact" to ReminderDiagnostics.canScheduleExactAlarms,
                    "last_schedule_method" to ReminderDiagnostics.lastScheduleMethod,
                    "issues" to ReminderDiagnostics.lastIssues.toList(),
                ),
                "alarm_registry" to alarmRegistry.mapKeys { it.key.take(8) },
                "upcoming_sample" to upcoming,
            ),
            "dirty_notes_sample" to dirtyNotes.take(5).map {
                mapOf(
                    "id" to it.id.take(8),
                    "title_len" to it.title.length,
                    "is_dirty" to it.isDirty,
                    "deleted_at" to it.deletedAt,
                )
            },
            "dirty_reminders_sample" to dirtyReminders.take(5).map {
                mapOf(
                    "id" to it.id.take(8),
                    "note_id" to it.noteId.take(8),
                    "fire_at" to it.fireAt,
                    "repeat_rule" to it.repeatRule,
                    "intensity" to it.intensity,
                    "status" to it.status,
                    "deleted_at" to it.deletedAt,
                )
            },
        )

        return DebugReportRequest(
            device_id = app.syncRepository.getDeviceId(),
            app_version = BuildConfig.VERSION_NAME,
            api_base_url = BuildConfig.API_BASE_URL,
            payload = payload,
        )
    }
}
