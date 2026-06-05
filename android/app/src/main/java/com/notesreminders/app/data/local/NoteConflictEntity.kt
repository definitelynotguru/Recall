package com.notesreminders.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "note_conflicts")
data class NoteConflictEntity(
    @PrimaryKey val id: String,
    val noteId: String,
    val localBody: String,
    val serverBody: String,
    val serverUpdatedAt: String,
    val detectedAt: String,
    val resolvedAt: String? = null,
)
