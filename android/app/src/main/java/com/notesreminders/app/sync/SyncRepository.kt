package com.notesreminders.app.sync

import android.content.Context
import com.notesreminders.app.data.api.NotesApi
import com.notesreminders.app.data.api.SyncRequest
import com.notesreminders.app.data.auth.TokenStore
import com.notesreminders.app.data.local.AppDatabase
import com.notesreminders.app.data.local.NoteConflictEntity
import com.notesreminders.app.data.local.SyncMetaEntity
import com.notesreminders.app.data.toDto
import com.notesreminders.app.data.toEntity
import com.notesreminders.app.reminders.ReminderReconciler
import java.time.Instant
import java.util.UUID

class SyncRepository(
    context: Context,
    private val db: AppDatabase,
    private val tokenStore: TokenStore,
    private val api: NotesApi,
) {
    private val reconciler = ReminderReconciler(context, db.reminderDao())

    suspend fun sync(): Result<Unit> {
        val result = runCatching {
            val userId = tokenStore.userId ?: error("Not logged in")
            val meta = db.syncMetaDao().get()
            val deviceId = meta?.deviceId ?: UUID.randomUUID().toString().also { newId ->
                if (meta == null) {
                    db.syncMetaDao().upsert(
                        SyncMetaEntity(
                            deviceId = newId,
                            lastSyncAt = "1970-01-01T00:00:00Z",
                            userId = userId,
                        ),
                    )
                }
            }
            val lastSync = meta?.lastSyncAt ?: "1970-01-01T00:00:00Z"

            val dirtyNotes = db.noteDao().getDirty()
            val dirtyReminders = db.reminderDao().getDirty()
            val dirtyTags = db.tagDao().getDirty()
            val dirtyNoteTags = db.noteTagDao().getDirty()
            val knownNoteIds = db.noteDao().getAllIds().toSet()

            val sanitized = SyncPayloadSanitizer.sanitize(
                dirtyNotes,
                dirtyReminders,
                knownNoteIds,
            )

            SyncDiagnostics.lastWarnings = sanitized.warnings
            SyncDiagnostics.lastSanitizedNoteCount = sanitized.notes.size
            SyncDiagnostics.lastSanitizedReminderCount = sanitized.reminders.size
            SyncDiagnostics.lastError = null

            val response = api.sync(
                SyncRequest(
                    device_id = deviceId,
                    last_sync_at = lastSync,
                    notes = sanitized.notes,
                    reminders = sanitized.reminders,
                    tags = dirtyTags.map { it.toDto() },
                    note_tags = dirtyNoteTags.map { it.toDto() },
                ),
            )

            val dirtyById = dirtyNotes.associateBy { it.id }
            val now = Instant.now().toString()
            val conflictedNoteIds = mutableSetOf<String>()
            response.notes.forEach { serverNote ->
                val local = dirtyById[serverNote.id]
                if (
                    local != null &&
                    (serverNote.body != local.body || serverNote.title != local.title) &&
                    serverNote.updated_at > local.updatedAt
                ) {
                    db.noteConflictDao().upsert(
                        NoteConflictEntity(
                            id = serverNote.id,
                            noteId = serverNote.id,
                            localBody = local.body,
                            serverBody = serverNote.body,
                            serverUpdatedAt = serverNote.updated_at,
                            detectedAt = now,
                        ),
                    )
                    conflictedNoteIds += serverNote.id
                }
            }

            val mergedNotes = response.notes
                .filterNot { it.id in conflictedNoteIds }
                .map { it.toEntity(userId, isDirty = false) }
            val mergedReminders = response.reminders.map { it.toEntity(userId, isDirty = false) }
            val mergedTags = response.tags.orEmpty().map { it.toEntity(userId, isDirty = false) }
            val mergedNoteTags = response.note_tags.orEmpty().map { it.toEntity(userId, isDirty = false) }

            db.applySyncMerge(
                notes = mergedNotes,
                reminders = mergedReminders,
                tags = mergedTags,
                noteTags = mergedNoteTags,
                syncMeta = SyncMetaEntity(
                    deviceId = deviceId,
                    lastSyncAt = response.server_time,
                    userId = userId,
                ),
            )
        }.onFailure {
            SyncDiagnostics.lastError = it.message
        }
        reconciler.reconcile()
        return result
    }

    fun getDeviceId(): String {
        return kotlinx.coroutines.runBlocking {
            db.syncMetaDao().get()?.deviceId ?: UUID.randomUUID().toString()
        }
    }
}
