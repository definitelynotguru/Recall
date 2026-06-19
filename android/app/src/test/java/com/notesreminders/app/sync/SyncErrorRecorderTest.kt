package com.notesreminders.app.sync

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncErrorRecorderTest {
    @Test
    fun buildsErrorsForSkippedEntities() {
        val skipped = SkippedSyncIds(
            noteIds = setOf("11111111-1111-4111-8111-111111111111"),
            reminderIds = setOf("22222222-2222-4222-8222-222222222222"),
        )
        val warnings = listOf("Skipped orphan reminder 22222222… (note missing)")

        val errors = SyncErrorRecorder.buildErrors(skipped, warnings, "2026-06-01T00:00:00Z")

        assertEquals(2, errors.size)
        assertTrue(errors.any { it.entityType == "note" })
        assertTrue(errors.any { it.entityType == "reminder" && it.message.contains("22222222") })
    }
}
