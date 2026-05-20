package com.notesreminders.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface SyncMetaDao {
    @Query("SELECT * FROM sync_meta WHERE id = 1 LIMIT 1")
    suspend fun get(): SyncMetaEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(meta: SyncMetaEntity)

    @Query("DELETE FROM sync_meta")
    suspend fun clearAll()
}
