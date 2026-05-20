package com.notesreminders.app.data

import com.notesreminders.app.data.api.NoteDto
import com.notesreminders.app.data.api.ReminderDto
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.ReminderEntity

fun NoteDto.toEntity(userId: String, isDirty: Boolean = false) = NoteEntity(
    id = id,
    userId = user_id ?: userId,
    title = title,
    body = body,
    status = status,
    createdAt = created_at,
    updatedAt = updated_at,
    deletedAt = deleted_at,
    isDirty = isDirty,
)

fun ReminderDto.toEntity(userId: String, isDirty: Boolean = false) = ReminderEntity(
    id = id,
    userId = user_id ?: userId,
    noteId = note_id,
    fireAt = fire_at,
    timezone = timezone,
    repeatRule = repeat_rule,
    intensity = intensity,
    status = status,
    completedAt = completed_at,
    createdAt = created_at,
    updatedAt = updated_at,
    deletedAt = deleted_at,
    isDirty = isDirty,
)

fun NoteEntity.toDto() = NoteDto(
    id = id,
    user_id = userId,
    title = title,
    body = body,
    status = status,
    created_at = createdAt,
    updated_at = updatedAt,
    deleted_at = deletedAt,
)

fun ReminderEntity.toDto() = ReminderDto(
    id = id,
    user_id = userId,
    note_id = noteId,
    fire_at = fireAt,
    timezone = timezone,
    repeat_rule = repeatRule,
    intensity = intensity,
    status = status,
    completed_at = completedAt,
    created_at = createdAt,
    updated_at = updatedAt,
    deleted_at = deletedAt,
)
