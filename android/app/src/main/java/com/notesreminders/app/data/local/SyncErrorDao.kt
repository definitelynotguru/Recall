package com.notesreminders.app.data.local

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "sync_errors")
data class SyncErrorEntity(
    @PrimaryKey val id: String,
    val entityType: String,
    val entityId: String,
    val message: String,
    val detectedAt: String,
)

@Dao
interface SyncErrorDao {
    @Query("SELECT * FROM sync_errors ORDER BY detectedAt DESC")
    fun observeAll(): Flow<List<SyncErrorEntity>>

    @Query("SELECT * FROM sync_errors ORDER BY detectedAt DESC")
    suspend fun getAll(): List<SyncErrorEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(rows: List<SyncErrorEntity>)

    @Query("DELETE FROM sync_errors WHERE entityId IN (:entityIds) AND entityType = :entityType")
    suspend fun clearForEntities(entityType: String, entityIds: Collection<String>)

    @Query("DELETE FROM sync_errors")
    suspend fun clearAll()
}
