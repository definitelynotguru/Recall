package com.notesreminders.app.sync

import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.NoteTagEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.data.local.TagEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class SyncPayloadSanitizerTest {
  private val noteId = UUID.randomUUID().toString()
  private val tagId = UUID.randomUUID().toString()

  @Test
  fun dropsInvalidNoteUuid() {
    val note = sampleNote(id = "not-uuid")
    val result = sanitizeNotesOnly(listOf(note))
    assertEquals(0, result.notes.size)
    assertTrue(result.warnings.any { it.contains("invalid id") })
  }

  @Test
  fun dropsOrphanReminder() {
    val reminder = sampleReminder(noteId = noteId)
    val result = sanitizeNotesOnly(reminders = listOf(reminder))
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
      emptyList(),
      emptyList(),
      setOf(noteId),
    )
    assertEquals(1, result.notes.size)
    assertEquals(1, result.reminders.size)
    assertEquals(noteId, result.notes[0].id)
  }

  @Test
  fun preservesPinnedAtOnSync() {
    val pinnedAt = "2026-06-01T12:00:00Z"
    val note = sampleNote(id = noteId, pinnedAt = pinnedAt)
    val result = sanitizeNotesOnly(listOf(note))
    assertEquals(pinnedAt, result.notes[0].pinned_at)
  }

  @Test
  fun dropsOrphanNoteTag() {
    val note = sampleNote(id = noteId)
    val noteTag = sampleNoteTag(noteId = noteId, tagId = tagId)
    val result = SyncPayloadSanitizer.sanitize(
      listOf(note),
      emptyList(),
      emptyList(),
      listOf(noteTag),
      setOf(noteId),
    )
    assertEquals(0, result.noteTags.size)
    assertTrue(result.warnings.any { it.contains("unknown tag") })
  }

  @Test
  fun acceptsValidTagAndNoteTag() {
    val note = sampleNote(id = noteId)
    val tag = sampleTag(id = tagId)
    val noteTag = sampleNoteTag(noteId = noteId, tagId = tagId)
    val result = SyncPayloadSanitizer.sanitize(
      listOf(note),
      emptyList(),
      listOf(tag),
      listOf(noteTag),
      setOf(noteId),
    )
    assertEquals(1, result.tags.size)
    assertEquals(1, result.noteTags.size)
  }

  private fun sanitizeNotesOnly(
    notes: List<NoteEntity> = emptyList(),
    reminders: List<ReminderEntity> = emptyList(),
  ) = SyncPayloadSanitizer.sanitize(notes, reminders, emptyList(), emptyList(), emptySet())

  private fun sampleNote(id: String, pinnedAt: String? = null) = NoteEntity(
    id = id,
    userId = UUID.randomUUID().toString(),
    title = "T",
    body = "",
    status = "active",
    pinnedAt = pinnedAt,
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

  private fun sampleTag(id: String) = TagEntity(
    id = id,
    userId = UUID.randomUUID().toString(),
    name = "work",
    createdAt = "2026-05-01T00:00:00Z",
    updatedAt = "2026-05-01T00:00:00Z",
    deletedAt = null,
    isDirty = true,
  )

  private fun sampleNoteTag(noteId: String, tagId: String) = NoteTagEntity(
    id = UUID.randomUUID().toString(),
    userId = UUID.randomUUID().toString(),
    noteId = noteId,
    tagId = tagId,
    createdAt = "2026-05-01T00:00:00Z",
    updatedAt = "2026-05-01T00:00:00Z",
    deletedAt = null,
    isDirty = true,
  )
}
