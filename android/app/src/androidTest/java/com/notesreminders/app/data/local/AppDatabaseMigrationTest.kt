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
    private val testDb = "migration-test"

    @get:Rule
    val helper: MigrationTestHelper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
    )

    @Test
    @Throws(IOException::class)
    fun migrate4To5AddsConflictTitleColumns() {
        helper.createDatabase(testDb, 4).apply {
            execSQL(
                "INSERT INTO note_conflicts (id, noteId, localBody, serverBody, serverUpdatedAt, detectedAt) " +
                    "VALUES ('c1', 'n1', 'local', 'server', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(testDb, 5, true, AppDatabase.MIGRATION_4_5)
        val cursor = db.query("PRAGMA table_info(note_conflicts)")
        val columns = mutableListOf<String>()
        while (cursor.moveToNext()) {
            columns += cursor.getString(cursor.getColumnIndexOrThrow("name"))
        }
        cursor.close()
        db.close()

        assertTrue(columns.contains("localTitle"))
        assertTrue(columns.contains("serverTitle"))
    }

    @Test
    fun openCurrentVersion() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java).build()
        db.openHelper.writableDatabase.close()
        db.close()
    }
}
