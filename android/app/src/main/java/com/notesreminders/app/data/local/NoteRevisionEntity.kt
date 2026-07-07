package com.notesreminders.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "note_revisions")
data class NoteRevisionEntity(
    @PrimaryKey val id: String,
    val noteId: String,
    val title: String,
    val body: String,
    val source: String,
    val createdAt: String,
)
