package com.notesreminders.app.data.local

import android.content.Context
import androidx.room.Room
import androidx.room.testing.MigrationTestHelper
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.io.IOException

@RunWith(AndroidJUnit4::class)
class AppDatabaseMigrationTest {
    @get:Rule
    val helper: MigrationTestHelper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
    )

    private fun columnsOf(db: androidx.sqlite.db.SupportSQLiteDatabase, table: String): List<String> {
        val cursor = db.query("PRAGMA table_info($table)")
        val cols = mutableListOf<String>()
        while (cursor.moveToNext()) {
            cols += cursor.getString(cursor.getColumnIndexOrThrow("name"))
        }
        cursor.close()
        return cols
    }

    private fun tableExists(db: androidx.sqlite.db.SupportSQLiteDatabase, table: String): Boolean {
        val cursor = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='$table'")
        val exists = cursor.moveToFirst()
        cursor.close()
        return exists
    }

    @Test
    @Throws(IOException::class)
    fun migrate1To2AddsPinnedAtColumn() {
        helper.createDatabase("m12", 1).apply {
            execSQL(
                "CREATE TABLE notes (id TEXT NOT NULL PRIMARY KEY, userId TEXT NOT NULL, " +
                    "title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, " +
                    "createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, " +
                    "isDirty INTEGER NOT NULL)",
            )
            execSQL(
                "INSERT INTO notes (id, userId, title, body, status, createdAt, updatedAt, deletedAt, isDirty) " +
                    "VALUES ('n1', 'u1', 'Title', 'Body', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', NULL, 0)",
            )
            close()
        }
        val db = helper.runMigrationsAndValidate("m12", 2, false, AppDatabase.MIGRATION_1_2)
        assertTrue(columnsOf(db, "notes").contains("pinnedAt"))
        val c = db.query("SELECT title FROM notes WHERE id = 'n1'")
        assertTrue(c.moveToFirst())
        assertTrue(c.getString(0) == "Title")
        c.close()
        db.close()
    }

    @Test
    @Throws(IOException::class)
    fun migrate2To3AddsTagsAndNoteTagsTables() {
        helper.createDatabase("m23", 2).apply {
            execSQL(
                "CREATE TABLE notes (id TEXT NOT NULL PRIMARY KEY, userId TEXT NOT NULL, " +
                    "title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, pinnedAt TEXT, " +
                    "createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, " +
                    "isDirty INTEGER NOT NULL)",
            )
            close()
        }
        val db = helper.runMigrationsAndValidate("m23", 3, false, AppDatabase.MIGRATION_2_3)
        assertTrue(tableExists(db, "tags"))
        assertTrue(tableExists(db, "note_tags"))
        db.close()
    }

    @Test
    @Throws(IOException::class)
    fun migrate3To4AddsNoteConflictsTable() {
        helper.createDatabase("m34", 3).apply {
            execSQL(
                "CREATE TABLE notes (id TEXT NOT NULL PRIMARY KEY, userId TEXT NOT NULL, " +
                    "title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, pinnedAt TEXT, " +
                    "createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, " +
                    "isDirty INTEGER NOT NULL)",
            )
            close()
        }
        val db = helper.runMigrationsAndValidate("m34", 4, false, AppDatabase.MIGRATION_3_4)
        assertTrue(tableExists(db, "note_conflicts"))
        db.close()
    }

    @Test
    @Throws(IOException::class)
    fun migrate4To5AddsConflictTitleColumns() {
        helper.createDatabase("m45", 4).apply {
            execSQL(
                "CREATE TABLE note_conflicts (id TEXT NOT NULL PRIMARY KEY, noteId TEXT NOT NULL, " +
                    "localBody TEXT NOT NULL, serverBody TEXT NOT NULL, serverUpdatedAt TEXT NOT NULL, " +
                    "detectedAt TEXT NOT NULL, resolvedAt TEXT)",
            )
            execSQL(
                "INSERT INTO note_conflicts (id, noteId, localBody, serverBody, serverUpdatedAt, detectedAt) " +
                    "VALUES ('c1', 'n1', 'local', 'server', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')",
            )
            close()
        }
        val db = helper.runMigrationsAndValidate("m45", 5, false, AppDatabase.MIGRATION_4_5)
        val cols = columnsOf(db, "note_conflicts")
        assertTrue(cols.contains("localTitle"))
        assertTrue(cols.contains("serverTitle"))
        val c = db.query("SELECT localBody FROM note_conflicts WHERE id = 'c1'")
        assertTrue(c.moveToFirst())
        assertTrue(c.getString(0) == "local")
        c.close()
        db.close()
    }

    @Test
    @Throws(IOException::class)
    fun migrate5To6AddsSyncErrorsTable() {
        helper.createDatabase("m56", 5).apply {
            execSQL(
                "CREATE TABLE notes (id TEXT NOT NULL PRIMARY KEY, userId TEXT NOT NULL, " +
                    "title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, pinnedAt TEXT, " +
                    "createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, " +
                    "isDirty INTEGER NOT NULL)",
            )
            close()
        }
        val db = helper.runMigrationsAndValidate("m56", 6, false, AppDatabase.MIGRATION_5_6)
        assertTrue(tableExists(db, "sync_errors"))
        db.close()
    }

    @Test
    @Throws(IOException::class)
    fun migrate6To7AddsPayloadColumn() {
        helper.createDatabase("m67", 6).apply {
            execSQL(
                "CREATE TABLE sync_errors (id TEXT NOT NULL PRIMARY KEY, entityType TEXT NOT NULL, " +
                    "entityId TEXT NOT NULL, message TEXT NOT NULL, detectedAt TEXT NOT NULL)",
            )
            execSQL(
                "INSERT INTO sync_errors (id, entityType, entityId, message, detectedAt) " +
                    "VALUES ('note:x', 'note', 'x', 'bad id', '2026-06-01T00:00:00Z')",
            )
            close()
        }
        val db = helper.runMigrationsAndValidate("m67", 7, false, AppDatabase.MIGRATION_6_7)
        assertTrue(columnsOf(db, "sync_errors").contains("payload"))
        val c = db.query("SELECT message FROM sync_errors WHERE id = 'note:x'")
        assertTrue(c.moveToFirst())
        assertTrue(c.getString(0) == "bad id")
        c.close()
        db.close()
    }

    @Test
    @Throws(IOException::class)
    fun migrate7To8AddsReminderModeColumns() {
        helper.createDatabase("m78", 7).apply {
            execSQL(
                "INSERT INTO reminders (id, userId, noteId, fireAt, timezone, repeatRule, " +
                    "intensity, status, completedAt, createdAt, updatedAt, deletedAt, isDirty) " +
                    "VALUES ('r1', 'u1', 'n1', '2026-01-01T00:00:00Z', 'UTC', NULL, 'gentle', " +
                    "'active', NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', NULL, 0)",
            )
            close()
        }
        val db = helper.runMigrationsAndValidate("m78", 8, false, AppDatabase.MIGRATION_7_8)
        val cols = columnsOf(db, "reminders")
        assertTrue(cols.contains("reminderMode"))
        assertTrue(cols.contains("nagIntervalMinutes"))
        val c = db.query("SELECT intensity FROM reminders WHERE id = 'r1'")
        assertTrue(c.moveToFirst())
        assertTrue(c.getString(0) == "gentle")
        c.close()
        db.close()
    }

    @Test
    @Throws(IOException::class)
    fun migrate1To8FreshUpgrade() {
        helper.createDatabase("m18", 1).apply {
            execSQL(
                "CREATE TABLE notes (id TEXT NOT NULL PRIMARY KEY, userId TEXT NOT NULL, " +
                    "title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, " +
                    "createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, " +
                    "isDirty INTEGER NOT NULL)",
            )
            execSQL(
                "INSERT INTO notes (id, userId, title, body, status, createdAt, updatedAt, deletedAt, isDirty) " +
                    "VALUES ('n1', 'u1', 'Keep me', 'Body', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', NULL, 0)",
            )
            close()
        }
        val db = helper.runMigrationsAndValidate(
            "m18",
            8,
            false,
            AppDatabase.MIGRATION_1_2,
            AppDatabase.MIGRATION_2_3,
            AppDatabase.MIGRATION_3_4,
            AppDatabase.MIGRATION_4_5,
            AppDatabase.MIGRATION_5_6,
            AppDatabase.MIGRATION_6_7,
            AppDatabase.MIGRATION_7_8,
        )
        assertTrue(columnsOf(db, "notes").contains("pinnedAt"))
        assertTrue(columnsOf(db, "sync_errors").contains("payload"))
        assertTrue(columnsOf(db, "reminders").contains("reminderMode"))
        assertTrue(columnsOf(db, "reminders").contains("nagIntervalMinutes"))
        assertTrue(tableExists(db, "tags"))
        assertTrue(tableExists(db, "note_tags"))
        assertTrue(tableExists(db, "note_conflicts"))
        assertTrue(tableExists(db, "sync_errors"))
        val c = db.query("SELECT title FROM notes WHERE id = 'n1'")
        assertTrue(c.moveToFirst())
        assertTrue(c.getString(0) == "Keep me")
        c.close()
        db.close()
    }

    @Test
    fun openCurrentVersion() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java).build()
        db.openHelper.writableDatabase.close()
        db.close()
    }
}
