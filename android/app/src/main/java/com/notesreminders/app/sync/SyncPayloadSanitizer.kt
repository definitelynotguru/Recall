package com.notesreminders.app.sync

import com.notesreminders.app.data.api.NoteDto
import com.notesreminders.app.data.api.NoteTagDto
import com.notesreminders.app.data.api.ReminderDto
import com.notesreminders.app.data.api.TagDto
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.NoteTagEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.data.local.TagEntity
import com.notesreminders.app.data.toDto

data class SanitizeResult(
    val notes: List<NoteDto>,
    val reminders: List<ReminderDto>,
    val tags: List<TagDto>,
    val noteTags: List<NoteTagDto>,
    val warnings: List<String>,
)

object SyncPayloadSanitizer {
    private val UUID_RE =
        Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

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

        for (note in dirtyNotes) {
            if (!isUuid(note.id)) {
                warnings.add("Skipped note with invalid id: ${note.id.take(24)}")
                continue
            }
            notes.add(note.toDto())
            noteIds.add(note.id)
        }

        for (tag in dirtyTags) {
            if (!isUuid(tag.id)) {
                warnings.add("Skipped tag with invalid id: ${tag.id.take(24)}")
                continue
            }
            if (tag.name.isBlank()) {
                warnings.add("Skipped tag ${tag.id.take(8)}… empty name")
                continue
            }
            tagIds.add(tag.id)
        }

        val reminders = mutableListOf<ReminderDto>()
        for (reminder in dirtyReminders) {
            if (!isUuid(reminder.id)) {
                warnings.add("Skipped reminder with invalid id: ${reminder.id.take(24)}")
                continue
            }
            if (!isUuid(reminder.noteId)) {
                warnings.add("Skipped reminder ${reminder.id.take(8)}… invalid note_id")
                continue
            }
            if (reminder.noteId !in noteIds) {
                warnings.add("Skipped orphan reminder ${reminder.id.take(8)}… (note missing)")
                continue
            }
            if (reminder.fireAt.isBlank()) {
                warnings.add("Skipped reminder ${reminder.id.take(8)}… empty fire_at")
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
                continue
            }
            if (!isUuid(noteTag.noteId) || noteTag.noteId !in noteIds) {
                warnings.add("Skipped orphan note_tag ${noteTag.id.take(8)}…")
                continue
            }
            if (!isUuid(noteTag.tagId) || noteTag.tagId !in tagIds) {
                warnings.add("Skipped note_tag ${noteTag.id.take(8)}… unknown tag")
                continue
            }
            noteTags.add(noteTag.toDto())
        }

        return SanitizeResult(notes, reminders, tags, noteTags, warnings)
    }

    private fun isUuid(value: String): Boolean = UUID_RE.matches(value)
}
