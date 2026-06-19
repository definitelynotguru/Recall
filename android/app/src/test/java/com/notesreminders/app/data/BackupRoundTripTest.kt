package com.notesreminders.app.data

import com.notesreminders.app.data.api.NoteDto
import com.notesreminders.app.data.api.ReminderDto
import com.notesreminders.app.data.api.TagDto
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.data.local.TagEntity
import com.google.gson.GsonBuilder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class BackupRoundTripTest {
    private val gson = GsonBuilder().setPrettyPrinting().create()

    @Test
    fun exportImportPreservesPinnedAndArchived() {
        val userId = UUID.randomUUID().toString()
        val noteId = UUID.randomUUID().toString()
        val pinnedAt = "2026-06-01T12:00:00Z"
        val note = NoteDto(
            id = noteId,
            user_id = userId,
            title = "Pinned archived",
            body = "body",
            status = "archived",
            pinned_at = pinnedAt,
            created_at = "2026-05-01T00:00:00Z",
            updated_at = "2026-05-02T00:00:00Z",
            deleted_at = null,
        )
        val reminder = ReminderDto(
            id = UUID.randomUUID().toString(),
            user_id = userId,
            note_id = noteId,
            fire_at = "2026-06-15T09:00:00.000Z",
            timezone = "UTC",
            repeat_rule = "weekly",
            intensity = "gentle",
            status = "active",
            completed_at = null,
            created_at = "2026-05-01T00:00:00Z",
            updated_at = "2026-05-01T00:00:00Z",
            deleted_at = null,
        )
        val tag = TagDto(
            id = UUID.randomUUID().toString(),
            user_id = userId,
            name = "work",
            created_at = "2026-05-01T00:00:00Z",
            updated_at = "2026-05-01T00:00:00Z",
            deleted_at = null,
        )
        val bundle = BackupBundle(
            exported_at = "2026-06-01T00:00:00Z",
            notes = listOf(note),
            reminders_by_note = mapOf(noteId to listOf(reminder)),
            tags = listOf(tag),
            note_tags = emptyList(),
        )
        val json = gson.toJson(bundle)
        val parsed = gson.fromJson(json, BackupBundle::class.java)
        val parsedNote = parsed.notes.orEmpty().first()
        assertEquals("archived", parsedNote.status)
        assertEquals(pinnedAt, parsedNote.pinned_at)
        assertEquals(1, parsed.reminders_by_note.orEmpty()[noteId]?.size)
        assertEquals(1, parsed.tags.orEmpty().size)
    }

    @Test
    fun noteEntityRoundTripKeepsPinnedAt() {
        val entity = NoteEntity(
            id = UUID.randomUUID().toString(),
            userId = UUID.randomUUID().toString(),
            title = "T",
            body = "B",
            status = "active",
            pinnedAt = "2026-06-01T12:00:00Z",
            createdAt = "2026-05-01T00:00:00Z",
            updatedAt = "2026-05-01T00:00:00Z",
            deletedAt = null,
            isDirty = true,
        )
        val dto = entity.toDto()
        val back = dto.toEntity(entity.userId, isDirty = true)
        assertEquals(entity.pinnedAt, back.pinnedAt)
        assertTrue(back.isDirty)
    }
}
