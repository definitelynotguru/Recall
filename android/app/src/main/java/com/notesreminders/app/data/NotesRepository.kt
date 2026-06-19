package com.notesreminders.app.data

import com.notesreminders.app.data.api.NotesApi
import com.notesreminders.app.data.auth.TokenStore
import com.notesreminders.app.data.local.AppDatabase
import com.notesreminders.app.data.local.NoteConflictEntity
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.NoteTagEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.data.local.TagEntity
import com.google.gson.GsonBuilder
import com.notesreminders.app.reminders.ReminderReconciler
import com.notesreminders.app.sync.SyncRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import java.time.Instant
import java.util.UUID

class NotesRepository(
    private val db: AppDatabase,
    private val api: NotesApi,
    private val tokenStore: TokenStore,
    private val syncRepository: SyncRepository,
    private val reconciler: ReminderReconciler,
) {
    private val gson = GsonBuilder().setPrettyPrinting().create()

    fun observeNotes(status: String, query: String, tagId: String? = null): Flow<List<NoteEntity>> =
        if (tagId.isNullOrBlank()) {
            db.noteDao().observeByStatusAndQuery(status, query)
        } else {
            db.noteDao().observeByStatusQueryAndTag(status, query, tagId)
        }

    fun observeTags(): Flow<List<TagEntity>> = db.tagDao().observeAllNonDeleted()

    fun observeTagsForNote(noteId: String): Flow<List<TagEntity>> =
        db.tagDao().observeForNote(noteId)

    fun observeHistoryReminders(): Flow<List<ReminderEntity>> = db.reminderDao().observeHistory()

    fun observeReminders(): Flow<List<ReminderEntity>> = db.reminderDao().observeActive()

    fun observeConflicts(): Flow<List<NoteConflictEntity>> = db.noteConflictDao().observeOpen()

    fun observeSyncErrors(): Flow<List<com.notesreminders.app.data.local.SyncErrorEntity>> =
        db.syncErrorDao().observeAll()

    fun observeHasPendingSync(): Flow<Boolean> =
        combine(
            db.noteDao().observeDirtyCount(),
            db.reminderDao().observeDirtyCount(),
            db.tagDao().observeDirtyCount(),
            db.noteTagDao().observeDirtyCount(),
        ) { notes, reminders, tags, noteTags ->
            notes > 0 || reminders > 0 || tags > 0 || noteTags > 0
        }

    suspend fun getNote(id: String): NoteEntity? = db.noteDao().getById(id)

    fun observeNote(id: String): Flow<NoteEntity?> = db.noteDao().observeById(id)

    suspend fun getRemindersForNote(noteId: String): List<ReminderEntity> =
        db.reminderDao().getByNoteId(noteId)

    fun observeRemindersForNote(noteId: String): Flow<List<ReminderEntity>> =
        db.reminderDao().observeByNoteId(noteId)

    suspend fun prepareForUser(userId: String) {
        val meta = db.syncMetaDao().get()
        if (meta?.userId != null && meta.userId != userId) {
            clearLocalData()
        }
    }

    suspend fun clearLocalData() {
        val reminders = db.reminderDao().getActive()
        reminders.forEach { reconciler.cancelAlarm(it.id) }
        db.reminderDao().clearAll()
        db.noteDao().clearAll()
        db.noteConflictDao().clearAll()
        db.syncErrorDao().clearAll()
        db.noteTagDao().clearAll()
        db.tagDao().clearAll()
        db.syncMetaDao().clearAll()
    }

    suspend fun createNote(title: String, body: String): NoteEntity {
        val userId = tokenStore.userId ?: error("Not logged in")
        val now = Instant.now().toString()
        val note = NoteEntity(
            id = UUID.randomUUID().toString(),
            userId = userId,
            title = title,
            body = body,
            status = "active",
            pinnedAt = null,
            createdAt = now,
            updatedAt = now,
            deletedAt = null,
            isDirty = true,
        )
        db.noteDao().upsert(note)
        return note
    }

    suspend fun createNoteFromText(text: String): NoteEntity {
        val clean = text.trim()
        val firstLine = clean.lineSequence().firstOrNull { it.isNotBlank() }?.trim().orEmpty()
        val title = firstLine.take(80).ifBlank { "Shared note" }
        return createNote(title, clean)
    }

    suspend fun reconcileAlarms() {
        reconciler.reconcile()
    }

    suspend fun saveNoteLocal(id: String, title: String, body: String) {
        val existing = db.noteDao().getById(id) ?: return
        if (existing.title == title && existing.body == body) return
        db.noteDao().upsert(
            existing.copy(
                title = title,
                body = body,
                updatedAt = Instant.now().toString(),
                isDirty = true,
            ),
        )
    }

    suspend fun setNotePinned(id: String, pinned: Boolean) {
        val existing = db.noteDao().getById(id) ?: return
        val now = Instant.now().toString()
        db.noteDao().upsert(
            existing.copy(
                pinnedAt = if (pinned) now else null,
                updatedAt = now,
                isDirty = true,
            ),
        )
    }

    suspend fun setNoteArchived(id: String, archived: Boolean) {
        val existing = db.noteDao().getById(id) ?: return
        val now = Instant.now().toString()
        db.noteDao().upsert(
            existing.copy(
                status = if (archived) "archived" else "active",
                updatedAt = now,
                isDirty = true,
            ),
        )
    }

    suspend fun createTag(name: String): TagEntity {
        val userId = tokenStore.userId ?: error("Not logged in")
        val trimmed = name.trim()
        require(trimmed.isNotEmpty() && trimmed.length <= 40) { "Invalid tag name" }
        val now = Instant.now().toString()
        val tag = TagEntity(
            id = UUID.randomUUID().toString(),
            userId = userId,
            name = trimmed,
            createdAt = now,
            updatedAt = now,
            deletedAt = null,
            isDirty = true,
        )
        db.tagDao().upsert(tag)
        return tag
    }

    suspend fun assignTag(noteId: String, tagId: String) {
        val userId = tokenStore.userId ?: error("Not logged in")
        db.tagDao().getById(tagId) ?: return
        val now = Instant.now().toString()
        val existing = db.noteTagDao().getByNoteAndTag(noteId, tagId)
        if (existing != null) {
            if (existing.deletedAt == null) return
            db.noteTagDao().upsert(
                existing.copy(deletedAt = null, updatedAt = now, isDirty = true),
            )
        } else {
            db.noteTagDao().upsert(
                NoteTagEntity(
                    id = UUID.randomUUID().toString(),
                    userId = userId,
                    noteId = noteId,
                    tagId = tagId,
                    createdAt = now,
                    updatedAt = now,
                    deletedAt = null,
                    isDirty = true,
                ),
            )
        }
    }

    suspend fun unassignTag(noteId: String, tagId: String) {
        val existing = db.noteTagDao().getByNoteAndTag(noteId, tagId) ?: return
        if (existing.deletedAt != null) return
        val now = Instant.now().toString()
        db.noteTagDao().upsert(
            existing.copy(deletedAt = now, updatedAt = now, isDirty = true),
        )
    }

    suspend fun resolveConflict(conflictId: String, keepLocal: Boolean) {
        val conflict = db.noteConflictDao().getById(conflictId) ?: return
        val now = Instant.now().toString()
        val note = db.noteDao().getById(conflict.noteId)
        if (note != null) {
            db.noteDao().upsert(
                note.copy(
                    title = if (keepLocal) conflict.localTitle else conflict.serverTitle,
                    body = if (keepLocal) conflict.localBody else conflict.serverBody,
                    updatedAt = now,
                    isDirty = true,
                ),
            )
        }
        db.noteConflictDao().resolve(conflictId, now)
    }

    suspend fun getLastSyncAt(): String? = db.syncMetaDao().get()?.lastSyncAt

    suspend fun exportBackupJson(): String {
        val reminders = db.reminderDao().getAllNonDeleted().map { it.toDto() }
        val bundle = BackupBundle(
            exported_at = Instant.now().toString(),
            notes = db.noteDao().getAllNonDeleted().map { it.toDto() },
            reminders_by_note = reminders.groupBy { it.note_id },
            tags = db.tagDao().getAllNonDeleted().map { it.toDto() },
            note_tags = db.noteTagDao().getAllNonDeleted().map { it.toDto() },
        )
        return gson.toJson(bundle)
    }

    suspend fun importBackupJson(json: String): BackupBundle {
        val userId = tokenStore.userId ?: error("Not logged in")
        val bundle = gson.fromJson(json, BackupBundle::class.java)

        db.tagDao().upsertAll(
            bundle.tags.orEmpty().map { dto ->
                dto.toEntity(userId, isDirty = true)
            },
        )
        db.noteDao().upsertAll(
            bundle.notes.orEmpty().map { dto ->
                dto.toEntity(userId, isDirty = true)
            },
        )
        db.reminderDao().upsertAll(
            bundle.reminders_by_note.orEmpty().values.flatten().map { dto ->
                dto.toEntity(userId, isDirty = true)
            },
        )
        db.noteTagDao().upsertAll(
            bundle.note_tags.orEmpty().map { dto ->
                dto.toEntity(userId, isDirty = true)
            },
        )
        reconciler.reconcile()
        return bundle
    }

    suspend fun deleteNote(id: String) {
        val existing = db.noteDao().getById(id) ?: return
        val now = Instant.now().toString()
        db.noteDao().upsert(
            existing.copy(deletedAt = now, updatedAt = now, isDirty = true),
        )
        db.reminderDao().getByNoteId(id).forEach { r ->
            reconciler.cancelAlarm(r.id)
            db.reminderDao().upsert(
                r.copy(deletedAt = now, updatedAt = now, status = "cancelled", isDirty = true),
            )
        }
        reconciler.reconcile()
    }

    suspend fun addReminder(
        noteId: String,
        fireAtIso: String,
        timezone: String,
        repeatRule: String?,
    ): ReminderEntity {
        val userId = tokenStore.userId ?: error("Not logged in")
        val now = Instant.now().toString()
        val reminder = ReminderEntity(
            id = UUID.randomUUID().toString(),
            userId = userId,
            noteId = noteId,
            fireAt = fireAtIso,
            timezone = timezone,
            repeatRule = repeatRule,
            intensity = "gentle",
            status = "active",
            completedAt = null,
            createdAt = now,
            updatedAt = now,
            deletedAt = null,
            isDirty = true,
        )
        db.reminderDao().upsert(reminder)
        reconciler.reconcile()
        return reminder
    }

    suspend fun updateReminder(
        id: String,
        fireAtIso: String,
        timezone: String,
        repeatRule: String?,
    ): ReminderEntity? {
        val existing = db.reminderDao().getById(id) ?: return null
        reconciler.cancelAlarm(id)
        val updated = existing.copy(
            fireAt = fireAtIso,
            timezone = timezone,
            repeatRule = repeatRule,
            updatedAt = Instant.now().toString(),
            isDirty = true,
        )
        db.reminderDao().upsert(updated)
        reconciler.reconcile()
        return updated
    }

    suspend fun deleteReminder(id: String) {
        val existing = db.reminderDao().getById(id) ?: return
        reconciler.cancelAlarm(id)
        val now = Instant.now().toString()
        db.reminderDao().upsert(
            existing.copy(
                deletedAt = now,
                updatedAt = now,
                status = "cancelled",
                isDirty = true,
            ),
        )
        reconciler.reconcile()
    }

    suspend fun completeReminder(id: String) {
        val reminder = db.reminderDao().getById(id) ?: return
        reconciler.cancelAlarm(id)
        val now = Instant.now().toString()
        try {
            api.completeReminder(id)
            applyCompleteLocally(reminder, now)
        } catch (_: Exception) {
            applyCompleteLocally(reminder, now)
        }
        syncRepository.sync()
        reconciler.reconcile()
    }

    private suspend fun applyCompleteLocally(reminder: ReminderEntity, now: String) {
        if (reminder.repeatRule != null) {
            val next = com.notesreminders.app.reminders.RepeatUtils.computeNextOccurrence(
                reminder.repeatRule,
                reminder.fireAt,
                reminder.timezone,
            )
            db.reminderDao().upsert(
                reminder.copy(
                    fireAt = next,
                    status = "active",
                    isDirty = true,
                    updatedAt = now,
                ),
            )
        } else {
            db.reminderDao().upsert(
                reminder.copy(
                    status = "completed",
                    completedAt = now,
                    isDirty = true,
                    updatedAt = now,
                ),
            )
        }
    }

    suspend fun snoozeReminder(id: String, snoozeUntilIso: String) {
        val reminder = db.reminderDao().getById(id) ?: return
        reconciler.cancelAlarm(id)
        val now = Instant.now().toString()
        try {
            api.snoozeReminder(id, com.notesreminders.app.data.api.SnoozeRequest(snoozeUntilIso))
        } catch (_: Exception) {
        }
        db.reminderDao().upsert(
            reminder.copy(
                fireAt = snoozeUntilIso,
                status = "active",
                isDirty = true,
                updatedAt = now,
            ),
        )
        syncRepository.sync()
        reconciler.reconcile()
    }

    suspend fun syncNow(): Result<Unit> = syncRepository.sync()
}
