package com.notesreminders.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tags")
data class TagEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val name: String,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String?,
    val isDirty: Boolean = false,
)
