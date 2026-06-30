package com.notesreminders.app.sync

import com.notesreminders.app.data.local.SyncErrorEntity
import java.time.Instant

object SyncErrorRecorder {
    fun buildErrors(skipped: List<SkippedRow>, warnings: List<String>, now: String = Instant.now().toString()): List<SyncErrorEntity> {
        val errors = mutableListOf<SyncErrorEntity>()

        for (row in skipped) {
            val defaultMessage = defaultForType(row.type)
            val message = warnings.firstOrNull { it.contains(row.id.take(8)) } ?: defaultMessage
            errors.add(
                SyncErrorEntity(
                    id = "${row.type}:${row.id}",
                    entityType = row.type,
                    entityId = row.id,
                    message = message,
                    detectedAt = now,
                    payload = row.payload,
                ),
            )
        }

        return errors
    }

    fun buildSyncFailure(message: String, now: String = Instant.now().toString()): SyncErrorEntity =
        SyncErrorEntity(
            id = "sync:failure",
            entityType = "sync",
            entityId = "sync",
            message = message,
            detectedAt = now,
            payload = null,
        )

    private fun defaultForType(type: String): String = when (type) {
        "note" -> "Note could not sync — fix or delete it locally"
        "reminder" -> "Reminder could not sync — check note link and fire time"
        "tag" -> "Tag could not sync — name may be invalid"
        "note_tag" -> "Tag link could not sync — note or tag may be missing"
        else -> "Item could not sync"
    }
}
