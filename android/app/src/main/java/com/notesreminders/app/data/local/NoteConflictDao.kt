package com.notesreminders.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteConflictDao {
    @Query("SELECT * FROM note_conflicts WHERE resolvedAt IS NULL ORDER BY detectedAt DESC")
    fun observeOpen(): Flow<List<NoteConflictEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(conflict: NoteConflictEntity)

    @Query("SELECT * FROM note_conflicts WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): NoteConflictEntity?

    @Query("UPDATE note_conflicts SET resolvedAt = :resolvedAt WHERE id = :id")
    suspend fun resolve(id: String, resolvedAt: String)

    @Query("DELETE FROM note_conflicts")
    suspend fun clearAll()
}
