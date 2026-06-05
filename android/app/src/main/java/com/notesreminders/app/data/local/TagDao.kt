package com.notesreminders.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface TagDao {
    @Query("SELECT * FROM tags WHERE isDirty = 1")
    suspend fun getDirty(): List<TagEntity>

    @Query("SELECT COUNT(*) FROM tags WHERE isDirty = 1")
    fun observeDirtyCount(): Flow<Int>

    @Query("SELECT * FROM tags WHERE deletedAt IS NULL ORDER BY name ASC")
    suspend fun getAllNonDeleted(): List<TagEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(tags: List<TagEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(tag: TagEntity)

    @Query("DELETE FROM tags")
    suspend fun clearAll()
}
