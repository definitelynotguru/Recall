package com.notesreminders.app.data

import com.notesreminders.app.data.api.NoteDto
import com.notesreminders.app.data.api.NoteTagDto
import com.notesreminders.app.data.api.ReminderDto
import com.notesreminders.app.data.api.TagDto
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.NoteTagEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.data.local.TagEntity

fun NoteDto.toEntity(userId: String, isDirty: Boolean = false) = NoteEntity(
    id = id,
    userId = user_id ?: userId,
    title = title,
    body = body,
    status = status,
    pinnedAt = pinned_at,
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
    reminderMode = reminder_mode,
    nagIntervalMinutes = nag_interval_minutes,
    status = status,
    completedAt = completed_at,
    createdAt = created_at,
    updatedAt = updated_at,
    deletedAt = deleted_at,
    isDirty = isDirty,
)

fun TagDto.toEntity(userId: String, isDirty: Boolean = false) = TagEntity(
    id = id,
    userId = user_id ?: userId,
    name = name,
    createdAt = created_at,
    updatedAt = updated_at,
    deletedAt = deleted_at,
    isDirty = isDirty,
)

fun NoteTagDto.toEntity(userId: String, isDirty: Boolean = false) = NoteTagEntity(
    id = id,
    userId = user_id ?: userId,
    noteId = note_id,
    tagId = tag_id,
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
    pinned_at = pinnedAt,
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
    reminder_mode = reminderMode,
    nag_interval_minutes = nagIntervalMinutes,
    status = status,
    completed_at = completedAt,
    created_at = createdAt,
    updated_at = updatedAt,
    deleted_at = deletedAt,
)

fun TagEntity.toDto() = TagDto(
    id = id,
    user_id = userId,
    name = name,
    created_at = createdAt,
    updated_at = updatedAt,
    deleted_at = deletedAt,
)

fun NoteTagEntity.toDto() = NoteTagDto(
    id = id,
    user_id = userId,
    note_id = noteId,
    tag_id = tagId,
    created_at = createdAt,
    updated_at = updatedAt,
    deleted_at = deletedAt,
)
