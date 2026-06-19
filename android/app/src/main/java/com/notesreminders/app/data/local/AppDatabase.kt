package com.notesreminders.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.Transaction
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        NoteEntity::class,
        ReminderEntity::class,
        SyncMetaEntity::class,
        TagEntity::class,
        NoteTagEntity::class,
        NoteConflictEntity::class,
    ],
    version = 5,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun noteDao(): NoteDao
    abstract fun reminderDao(): ReminderDao
    abstract fun syncMetaDao(): SyncMetaDao
    abstract fun tagDao(): TagDao
    abstract fun noteTagDao(): NoteTagDao
    abstract fun noteConflictDao(): NoteConflictDao

    @Transaction
    open suspend fun applySyncMerge(
        notes: List<NoteEntity>,
        reminders: List<ReminderEntity>,
        tags: List<TagEntity>,
        noteTags: List<NoteTagEntity>,
        syncMeta: SyncMetaEntity,
    ) {
        noteDao().upsertAll(notes)
        reminderDao().upsertAll(reminders)
        tagDao().upsertAll(tags)
        noteTagDao().upsertAll(noteTags)
        syncMetaDao().upsert(syncMeta)
    }

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE notes ADD COLUMN pinnedAt TEXT")
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS index_notes_status_pinned_updated " +
                        "ON notes(status, pinnedAt, updatedAt)",
                )
            }
        }
        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS tags (" +
                        "id TEXT NOT NULL PRIMARY KEY, " +
                        "userId TEXT NOT NULL, " +
                        "name TEXT NOT NULL, " +
                        "createdAt TEXT NOT NULL, " +
                        "updatedAt TEXT NOT NULL, " +
                        "deletedAt TEXT, " +
                        "isDirty INTEGER NOT NULL DEFAULT 0)",
                )
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS note_tags (" +
                        "id TEXT NOT NULL PRIMARY KEY, " +
                        "userId TEXT NOT NULL, " +
                        "noteId TEXT NOT NULL, " +
                        "tagId TEXT NOT NULL, " +
                        "createdAt TEXT NOT NULL, " +
                        "updatedAt TEXT NOT NULL, " +
                        "deletedAt TEXT, " +
                        "isDirty INTEGER NOT NULL DEFAULT 0)",
                )
            }
        }
        val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS note_conflicts (" +
                        "id TEXT NOT NULL PRIMARY KEY, " +
                        "noteId TEXT NOT NULL, " +
                        "localBody TEXT NOT NULL, " +
                        "serverBody TEXT NOT NULL, " +
                        "serverUpdatedAt TEXT NOT NULL, " +
                        "detectedAt TEXT NOT NULL, " +
                        "resolvedAt TEXT)",
                )
            }
        }
        val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE note_conflicts ADD COLUMN localTitle TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE note_conflicts ADD COLUMN serverTitle TEXT NOT NULL DEFAULT ''")
            }
        }
    }
}
