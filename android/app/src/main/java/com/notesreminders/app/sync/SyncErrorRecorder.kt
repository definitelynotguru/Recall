package com.notesreminders.app.sync

import com.notesreminders.app.data.local.SyncErrorEntity
import java.time.Instant

object SyncErrorRecorder {
    fun buildErrors(skipped: SkippedSyncIds, warnings: List<String>, now: String = Instant.now().toString()): List<SyncErrorEntity> {
        val errors = mutableListOf<SyncErrorEntity>()

        fun record(type: String, id: String, defaultMessage: String) {
            val message = warnings.firstOrNull { it.contains(id.take(8)) } ?: defaultMessage
            errors.add(
                SyncErrorEntity(
                    id = "$type:$id",
                    entityType = type,
                    entityId = id,
                    message = message,
                    detectedAt = now,
                ),
            )
        }

        for (id in skipped.noteIds) {
            record("note", id, "Note could not sync — fix or delete it locally")
        }
        for (id in skipped.reminderIds) {
            record("reminder", id, "Reminder could not sync — check note link and fire time")
        }
        for (id in skipped.tagIds) {
            record("tag", id, "Tag could not sync — name may be invalid")
        }
        for (id in skipped.noteTagIds) {
            record("note_tag", id, "Tag link could not sync — note or tag may be missing")
        }

        return errors
    }
}
