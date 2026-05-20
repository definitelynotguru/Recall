package com.notesreminders.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_meta")
data class SyncMetaEntity(
    @PrimaryKey val id: Int = 1,
    val deviceId: String,
    val lastSyncAt: String,
    val userId: String?,
)
