package com.notesreminders.app.sync

import com.google.gson.Gson
import com.notesreminders.app.data.api.NoteDto
import com.notesreminders.app.data.api.NoteTagDto
import com.notesreminders.app.data.api.ReminderDto
import com.notesreminders.app.data.api.TagDto
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.NoteTagEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.data.local.TagEntity
import com.notesreminders.app.data.toDto

data class SkippedRow(
    val type: String,
    val id: String,
    val payload: String?,
)

data class SanitizeResult(
    val notes: List<NoteDto>,
    val reminders: List<ReminderDto>,
    val tags: List<TagDto>,
    val noteTags: List<NoteTagDto>,
    val warnings: List<String>,
    val skipped: List<SkippedRow> = emptyList(),
)

object SyncPayloadSanitizer {
    private val UUID_RE =
        Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

    private val gson = Gson()

    fun sanitize(
        dirtyNotes: List<NoteEntity>,
        dirtyReminders: List<ReminderEntity>,
        dirtyTags: List<TagEntity>,
        dirtyNoteTags: List<NoteTagEntity>,
        knownNoteIds: Set<String>,
    ): SanitizeResult {
        val warnings = mutableListOf<String>()
        val notes = mutableListOf<NoteDto>()
        val noteIds = knownNoteIds.toMutableSet()
        val tagIds = mutableSetOf<String>()
        val skipped = mutableListOf<SkippedRow>()

        for (note in dirtyNotes) {
            if (!isUuid(note.id)) {
                warnings.add("Skipped note with invalid id: ${note.id.take(24)}")
                skipped.add(SkippedRow("note", note.id, gson.toJson(note)))
                continue
            }
            notes.add(note.toDto())
            noteIds.add(note.id)
        }

        for (tag in dirtyTags) {
            if (!isUuid(tag.id)) {
                warnings.add("Skipped tag with invalid id: ${tag.id.take(24)}")
                skipped.add(SkippedRow("tag", tag.id, gson.toJson(tag)))
                continue
            }
            if (tag.name.isBlank()) {
                warnings.add("Skipped tag ${tag.id.take(8)}\u2026 empty name")
                skipped.add(SkippedRow("tag", tag.id, gson.toJson(tag)))
                continue
            }
            tagIds.add(tag.id)
        }

        val reminders = mutableListOf<ReminderDto>()
        for (reminder in dirtyReminders) {
            if (!isUuid(reminder.id)) {
                warnings.add("Skipped reminder with invalid id: ${reminder.id.take(24)}")
                skipped.add(SkippedRow("reminder", reminder.id, gson.toJson(reminder)))
                continue
            }
            if (!isUuid(reminder.noteId)) {
                warnings.add("Skipped reminder ${reminder.id.take(8)}\u2026 invalid note_id")
                skipped.add(SkippedRow("reminder", reminder.id, gson.toJson(reminder)))
                continue
            }
            if (reminder.noteId !in noteIds) {
                warnings.add("Skipped orphan reminder ${reminder.id.take(8)}\u2026 (note missing)")
                skipped.add(SkippedRow("reminder", reminder.id, gson.toJson(reminder)))
                continue
            }
            if (reminder.fireAt.isBlank()) {
                warnings.add("Skipped reminder ${reminder.id.take(8)}\u2026 empty fire_at")
                skipped.add(SkippedRow("reminder", reminder.id, gson.toJson(reminder)))
                continue
            }
            reminders.add(reminder.toDto())
        }

        val tags = dirtyTags
            .filter { it.id in tagIds }
            .map { it.toDto() }

        val noteTags = mutableListOf<NoteTagDto>()
        for (noteTag in dirtyNoteTags) {
            if (!isUuid(noteTag.id)) {
                warnings.add("Skipped note_tag with invalid id: ${noteTag.id.take(24)}")
                skipped.add(SkippedRow("note_tag", noteTag.id, gson.toJson(noteTag)))
                continue
            }
            if (!isUuid(noteTag.noteId) || noteTag.noteId !in noteIds) {
                warnings.add("Skipped orphan note_tag ${noteTag.id.take(8)}\u2026")
                skipped.add(SkippedRow("note_tag", noteTag.id, gson.toJson(noteTag)))
                continue
            }
            if (!isUuid(noteTag.tagId) || noteTag.tagId !in tagIds) {
                warnings.add("Skipped note_tag ${noteTag.id.take(8)}\u2026 unknown tag")
                skipped.add(SkippedRow("note_tag", noteTag.id, gson.toJson(noteTag)))
                continue
            }
            noteTags.add(noteTag.toDto())
        }

        return SanitizeResult(
            notes,
            reminders,
            tags,
            noteTags,
            warnings,
            skipped,
        )
    }

    private fun isUuid(value: String): Boolean = UUID_RE.matches(value)
}
