package com.notesreminders.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteTagDao {
    @Query("SELECT * FROM note_tags WHERE isDirty = 1")
    suspend fun getDirty(): List<NoteTagEntity>

    @Query("SELECT COUNT(*) FROM note_tags WHERE isDirty = 1")
    fun observeDirtyCount(): Flow<Int>

    @Query("SELECT * FROM note_tags WHERE deletedAt IS NULL")
    suspend fun getAllNonDeleted(): List<NoteTagEntity>

    @Query("SELECT * FROM note_tags WHERE noteId = :noteId AND tagId = :tagId LIMIT 1")
    suspend fun getByNoteAndTag(noteId: String, tagId: String): NoteTagEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(noteTags: List<NoteTagEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(noteTag: NoteTagEntity)

    @Query("DELETE FROM note_tags")
    suspend fun clearAll()
}
