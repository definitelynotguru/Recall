package com.notesreminders.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "reminders")
data class ReminderEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val noteId: String,
    val fireAt: String,
    val timezone: String,
    val repeatRule: String?,
    val intensity: String,
    val reminderMode: String = "once",
    val nagIntervalMinutes: Int? = null,
    val status: String,
    val completedAt: String?,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String?,
    val isDirty: Boolean = false,
)
