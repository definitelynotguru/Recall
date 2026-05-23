package com.notesreminders.app.sync

import com.notesreminders.app.data.api.NoteDto
import com.notesreminders.app.data.api.ReminderDto
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.ReminderEntity

data class SanitizeResult(
    val notes: List<NoteDto>,
    val reminders: List<ReminderDto>,
    val warnings: List<String>,
)

object SyncPayloadSanitizer {
    private val UUID_RE =
        Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

    fun sanitize(
        dirtyNotes: List<NoteEntity>,
        dirtyReminders: List<ReminderEntity>,
        knownNoteIds: Set<String>,
    ): SanitizeResult {
        val warnings = mutableListOf<String>()
        val notes = mutableListOf<NoteDto>()
        val noteIds = knownNoteIds.toMutableSet()

        for (note in dirtyNotes) {
            if (!isUuid(note.id)) {
                warnings.add("Skipped note with invalid id: ${note.id.take(24)}")
                continue
            }
            notes.add(note.toSyncDto())
            noteIds.add(note.id)
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
            reminders.add(reminder.toSyncDto())
        }

        return SanitizeResult(notes, reminders, warnings)
    }

    private fun isUuid(value: String): Boolean = UUID_RE.matches(value)

    private fun NoteEntity.toSyncDto() = NoteDto(
        id = id,
        title = title,
        body = body,
        status = status.ifBlank { "active" },
        created_at = createdAt,
        updated_at = updatedAt,
        deleted_at = deletedAt,
    )

    private fun ReminderEntity.toSyncDto() = ReminderDto(
        id = id,
        note_id = noteId,
        fire_at = fireAt,
        timezone = timezone.ifBlank { "UTC" },
        repeat_rule = repeatRule?.takeIf { it.isNotBlank() },
        intensity = intensity.ifBlank { "gentle" },
        status = status.ifBlank { "active" },
        completed_at = completedAt,
        created_at = createdAt,
        updated_at = updatedAt,
        deleted_at = deletedAt,
    )
}
