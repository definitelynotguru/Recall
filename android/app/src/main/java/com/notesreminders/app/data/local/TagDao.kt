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

    @Query("SELECT * FROM tags WHERE deletedAt IS NULL ORDER BY name ASC")
    fun observeAllNonDeleted(): Flow<List<TagEntity>>

    @Query("SELECT * FROM tags WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): TagEntity?

    @Query(
        """
        SELECT tags.* FROM tags
        INNER JOIN note_tags ON note_tags.tagId = tags.id
        WHERE note_tags.noteId = :noteId
        AND note_tags.deletedAt IS NULL
        AND tags.deletedAt IS NULL
        ORDER BY tags.name ASC
        """,
    )
    fun observeForNote(noteId: String): Flow<List<TagEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(tags: List<TagEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(tag: TagEntity)

    @Query("DELETE FROM tags")
    suspend fun clearAll()
}
