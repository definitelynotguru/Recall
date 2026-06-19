package com.notesreminders.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteDao {
    @Query(
        "SELECT * FROM notes WHERE deletedAt IS NULL AND status = 'active' " +
            "ORDER BY pinnedAt IS NULL ASC, pinnedAt DESC, updatedAt DESC",
    )
    fun observeActive(): Flow<List<NoteEntity>>

    @Query(
        "SELECT * FROM notes WHERE deletedAt IS NULL AND status = 'active' " +
            "ORDER BY pinnedAt IS NULL ASC, pinnedAt DESC, updatedAt DESC",
    )
    suspend fun getActive(): List<NoteEntity>

    @Query("SELECT * FROM notes WHERE deletedAt IS NULL ORDER BY updatedAt DESC")
    suspend fun getAllNonDeleted(): List<NoteEntity>

    @Query(
        "SELECT * FROM notes WHERE deletedAt IS NULL AND status = :status " +
            "AND (:query = '' OR title LIKE '%' || :query || '%' OR body LIKE '%' || :query || '%') " +
            "ORDER BY pinnedAt IS NULL ASC, pinnedAt DESC, updatedAt DESC",
    )
    fun observeByStatusAndQuery(status: String, query: String): Flow<List<NoteEntity>>

    @Query(
        """
        SELECT notes.* FROM notes
        INNER JOIN note_tags ON note_tags.noteId = notes.id
        WHERE notes.deletedAt IS NULL AND notes.status = :status
        AND note_tags.tagId = :tagId AND note_tags.deletedAt IS NULL
        AND (:query = '' OR notes.title LIKE '%' || :query || '%' OR notes.body LIKE '%' || :query || '%')
        ORDER BY notes.pinnedAt IS NULL ASC, notes.pinnedAt DESC, notes.updatedAt DESC
        """,
    )
    fun observeByStatusQueryAndTag(status: String, query: String, tagId: String): Flow<List<NoteEntity>>

    @Query("SELECT * FROM notes WHERE isDirty = 1")
    suspend fun getDirty(): List<NoteEntity>

    @Query("SELECT COUNT(*) FROM notes WHERE isDirty = 1")
    fun observeDirtyCount(): Flow<Int>

    @Query("SELECT * FROM notes WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): NoteEntity?

    @Query("SELECT id FROM notes")
    suspend fun getAllIds(): List<String>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(note: NoteEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(notes: List<NoteEntity>)

    @Update
    suspend fun update(note: NoteEntity)

    @Query("DELETE FROM notes")
    suspend fun clearAll()
}
