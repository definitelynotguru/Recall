package com.notesreminders.app.data

import com.notesreminders.app.data.api.NoteDto
import com.notesreminders.app.data.api.NoteTagDto
import com.notesreminders.app.data.api.ReminderDto
import com.notesreminders.app.data.api.TagDto

data class BackupBundle(
    val exported_at: String,
    val notes: List<NoteDto>?,
    val reminders_by_note: Map<String, List<ReminderDto>>?,
    val tags: List<TagDto>? = emptyList(),
    val note_tags: List<NoteTagDto>? = emptyList(),
)
