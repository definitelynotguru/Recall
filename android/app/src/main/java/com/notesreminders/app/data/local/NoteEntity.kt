package com.notesreminders.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val title: String,
    val body: String,
    val status: String,
    val pinnedAt: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String?,
    val isDirty: Boolean = false,
)
