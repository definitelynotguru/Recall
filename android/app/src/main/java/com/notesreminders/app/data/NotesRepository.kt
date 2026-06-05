package com.notesreminders.app.data

import com.notesreminders.app.data.api.NotesApi
import com.notesreminders.app.data.auth.TokenStore
import com.notesreminders.app.data.local.AppDatabase
import com.notesreminders.app.data.local.NoteConflictEntity
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.ReminderEntity
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

    fun observeNotes(): Flow<List<NoteEntity>> = db.noteDao().observeActive()

    fun observeNotes(status: String, query: String): Flow<List<NoteEntity>> =
        db.noteDao().observeByStatusAndQuery(status, query)

    fun observeReminders(): Flow<List<ReminderEntity>> = db.reminderDao().observeActive()

    fun observeConflicts(): Flow<List<NoteConflictEntity>> = db.noteConflictDao().observeOpen()

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

    suspend fun getRemindersForNote(noteId: String): List<ReminderEntity> =
        db.reminderDao().getByNoteId(noteId)

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

    suspend fun resolveConflict(conflictId: String, keepLocal: Boolean) {
        val conflict = db.noteConflictDao().getById(conflictId) ?: return
        val now = Instant.now().toString()
        val note = db.noteDao().getById(conflict.noteId)
        if (note != null) {
            db.noteDao().upsert(
                note.copy(
                    body = if (keepLocal) conflict.localBody else conflict.serverBody,
                    updatedAt = now,
                    isDirty = true,
                ),
            )
        }
        db.noteConflictDao().resolve(conflictId, now)
    }

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

    suspend fun syncNow(): Result<Unit> = syncRepository.sync()
}
