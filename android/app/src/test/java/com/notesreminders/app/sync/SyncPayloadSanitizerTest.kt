package com.notesreminders.app.sync

import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.ReminderEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class SyncPayloadSanitizerTest {
  private val noteId = UUID.randomUUID().toString()

  @Test
  fun dropsInvalidNoteUuid() {
    val note = sampleNote(id = "not-uuid")
    val result = SyncPayloadSanitizer.sanitize(listOf(note), emptyList(), emptySet())
    assertEquals(0, result.notes.size)
    assertTrue(result.warnings.any { it.contains("invalid id") })
  }

  @Test
  fun dropsOrphanReminder() {
    val reminder = sampleReminder(noteId = noteId)
    val result = SyncPayloadSanitizer.sanitize(emptyList(), listOf(reminder), emptySet())
    assertEquals(0, result.reminders.size)
    assertTrue(result.warnings.any { it.contains("orphan") })
  }

  @Test
  fun acceptsValidDirtyPair() {
    val note = sampleNote(id = noteId)
    val reminder = sampleReminder(noteId = noteId)
    val result = SyncPayloadSanitizer.sanitize(
      listOf(note),
      listOf(reminder),
      setOf(noteId),
    )
    assertEquals(1, result.notes.size)
    assertEquals(1, result.reminders.size)
    assertEquals(null, result.notes[0].user_id)
  }

  private fun sampleNote(id: String) = NoteEntity(
    id = id,
    userId = UUID.randomUUID().toString(),
    title = "T",
    body = "",
    status = "active",
    createdAt = "2026-05-01T00:00:00Z",
    updatedAt = "2026-05-01T00:00:00Z",
    deletedAt = null,
    isDirty = true,
  )

  private fun sampleReminder(noteId: String) = ReminderEntity(
    id = UUID.randomUUID().toString(),
    userId = UUID.randomUUID().toString(),
    noteId = noteId,
    fireAt = "2026-06-01T09:00:00.000Z",
    timezone = "UTC",
    repeatRule = null,
    intensity = "gentle",
    status = "active",
    completedAt = null,
    createdAt = "2026-05-01T00:00:00Z",
    updatedAt = "2026-05-01T00:00:00Z",
    deletedAt = null,
    isDirty = true,
  )
}
