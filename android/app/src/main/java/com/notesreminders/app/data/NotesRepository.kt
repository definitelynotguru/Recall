package com.notesreminders.app.data

import com.notesreminders.app.data.api.NoteDto
import com.notesreminders.app.data.api.NotesApi
import com.notesreminders.app.data.auth.TokenStore
import com.notesreminders.app.data.local.AppDatabase
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.reminders.ReminderReconciler
import com.notesreminders.app.sync.SyncRepository
import kotlinx.coroutines.flow.Flow
import java.time.Instant
import java.util.UUID

class NotesRepository(
    private val db: AppDatabase,
    private val api: NotesApi,
    private val tokenStore: TokenStore,
    private val syncRepository: SyncRepository,
    private val reconciler: ReminderReconciler,
) {
    fun observeNotes(): Flow<List<NoteEntity>> = db.noteDao().observeActive()

    fun observeReminders(): Flow<List<ReminderEntity>> = db.reminderDao().observeActive()

    suspend fun getNote(id: String): NoteEntity? = db.noteDao().getById(id)

    suspend fun getRemindersForNote(noteId: String): List<ReminderEntity> =
        db.reminderDao().getByNoteId(noteId)

    suspend fun createNote(title: String, body: String): NoteEntity {
        val userId = tokenStore.userId ?: error("Not logged in")
        val now = Instant.now().toString()
        val note = NoteEntity(
            id = UUID.randomUUID().toString(),
            userId = userId,
            title = title,
            body = body,
            status = "active",
            createdAt = now,
            updatedAt = now,
            deletedAt = null,
            isDirty = true,
        )
        db.noteDao().upsert(note)
        syncRepository.sync()
        return note
    }

    suspend fun updateNote(id: String, title: String, body: String) {
        val existing = db.noteDao().getById(id) ?: return
        val updated = existing.copy(
            title = title,
            body = body,
            updatedAt = Instant.now().toString(),
            isDirty = true,
        )
        db.noteDao().upsert(updated)
        syncRepository.sync()
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
        syncRepository.sync()
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
        syncRepository.sync()
        reconciler.reconcile()
        return reminder
    }

    suspend fun syncNow() = syncRepository.sync()
}
