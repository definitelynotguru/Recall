package com.notesreminders.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteRevisionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(revision: NoteRevisionEntity)

    @Query("SELECT * FROM note_revisions WHERE noteId = :noteId ORDER BY createdAt DESC LIMIT :limit")
    fun observeForNote(
        noteId: String,
        limit: Int,
    ): Flow<List<NoteRevisionEntity>>

    @Query("SELECT * FROM note_revisions WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): NoteRevisionEntity?

    @Query("DELETE FROM note_revisions WHERE noteId = :noteId AND createdAt < :cutoff")
    suspend fun deleteOlderThan(
        noteId: String,
        cutoff: String,
    )

    @Query(
        "DELETE FROM note_revisions WHERE noteId = :noteId AND id NOT IN " +
            "(SELECT id FROM note_revisions WHERE noteId = :noteId ORDER BY createdAt DESC LIMIT :keep)",
    )
    suspend fun keepLatest(
        noteId: String,
        keep: Int,
    )

    @Query("DELETE FROM note_revisions WHERE noteId = :noteId")
    suspend fun deleteForNote(noteId: String)
}
