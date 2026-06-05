package com.notesreminders.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "note_tags")
data class NoteTagEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val noteId: String,
    val tagId: String,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String?,
    val isDirty: Boolean = false,
)
