package com.notesreminders.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ReminderDao {
    @Query(
        "SELECT * FROM reminders WHERE deletedAt IS NULL AND status = 'active' ORDER BY fireAt ASC",
    )
    fun observeActive(): Flow<List<ReminderEntity>>

    @Query(
        """
        SELECT * FROM reminders
        WHERE deletedAt IS NULL AND status IN ('completed', 'cancelled')
        ORDER BY COALESCE(completedAt, fireAt) DESC
        """,
    )
    fun observeHistory(): Flow<List<ReminderEntity>>

    @Query(
        "SELECT * FROM reminders WHERE deletedAt IS NULL AND status = 'active' ORDER BY fireAt ASC",
    )
    suspend fun getActive(): List<ReminderEntity>

    @Query("SELECT * FROM reminders WHERE deletedAt IS NULL ORDER BY fireAt ASC")
    suspend fun getAllNonDeleted(): List<ReminderEntity>

    @Query("SELECT * FROM reminders WHERE isDirty = 1")
    suspend fun getDirty(): List<ReminderEntity>

    @Query("SELECT COUNT(*) FROM reminders WHERE isDirty = 1")
    fun observeDirtyCount(): Flow<Int>

    @Query("SELECT * FROM reminders WHERE noteId = :noteId AND deletedAt IS NULL")
    suspend fun getByNoteId(noteId: String): List<ReminderEntity>

    @Query("SELECT * FROM reminders WHERE noteId = :noteId AND deletedAt IS NULL")
    fun observeByNoteId(noteId: String): Flow<List<ReminderEntity>>

    @Query("SELECT * FROM reminders WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ReminderEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(reminder: ReminderEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(reminders: List<ReminderEntity>)

    @Query("DELETE FROM reminders")
    suspend fun clearAll()
}
