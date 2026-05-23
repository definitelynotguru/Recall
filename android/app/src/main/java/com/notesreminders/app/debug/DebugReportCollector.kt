package com.notesreminders.app.debug

import com.notesreminders.app.BuildConfig
import com.notesreminders.app.NotesApp
import com.notesreminders.app.data.api.DebugReportRequest
import com.notesreminders.app.sync.SyncDiagnostics
import kotlinx.coroutines.runBlocking

object DebugReportCollector {
    fun collect(app: NotesApp, lastSyncHint: String?): DebugReportRequest {
        val dirtyNotes = runBlocking { app.database.noteDao().getDirty() }
        val dirtyReminders = runBlocking { app.database.reminderDao().getDirty() }

        val payload = mutableMapOf<String, Any?>(
            "platform" to "android",
            "is_online" to app.networkMonitor.currentIsOnline(),
            "user_email" to app.tokenStore.userEmail,
            "user_id" to app.tokenStore.userId,
            "last_sync_hint" to lastSyncHint,
            "last_sync_error" to SyncDiagnostics.lastError,
            "sanitize_warnings" to SyncDiagnostics.lastWarnings,
            "sync" to mapOf(
                "dirty_note_count" to dirtyNotes.size,
                "dirty_reminder_count" to dirtyReminders.size,
                "last_sent_note_count" to SyncDiagnostics.lastSanitizedNoteCount,
                "last_sent_reminder_count" to SyncDiagnostics.lastSanitizedReminderCount,
            ),
            "dirty_notes_sample" to dirtyNotes.take(5).map {
                mapOf(
                    "id" to it.id,
                    "title_len" to it.title.length,
                    "is_dirty" to it.isDirty,
                    "deleted_at" to it.deletedAt,
                )
            },
            "dirty_reminders_sample" to dirtyReminders.take(5).map {
                mapOf(
                    "id" to it.id,
                    "note_id" to it.noteId,
                    "fire_at" to it.fireAt,
                    "repeat_rule" to it.repeatRule,
                    "intensity" to it.intensity,
                    "status" to it.status,
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
