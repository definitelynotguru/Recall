package com.notesreminders.app.sync

import android.content.Context
import com.notesreminders.app.data.api.ApiClient
import com.notesreminders.app.data.api.SyncRequest
import com.notesreminders.app.data.auth.TokenStore
import com.notesreminders.app.data.local.AppDatabase
import com.notesreminders.app.data.local.SyncMetaEntity
import com.notesreminders.app.data.toDto
import com.notesreminders.app.data.toEntity
import com.notesreminders.app.reminders.ReminderReconciler
import java.time.Instant
import java.util.UUID

class SyncRepository(
    context: Context,
    private val db: AppDatabase,
    private val tokenStore: TokenStore,
) {
    private val api = ApiClient.create(tokenStore)
    private val reconciler = ReminderReconciler(context, db.reminderDao())

    suspend fun sync(): Result<Unit> = runCatching {
        val userId = tokenStore.userId ?: error("Not logged in")
        val meta = db.syncMetaDao().get()
        val deviceId = meta?.deviceId ?: UUID.randomUUID().toString()
        val lastSync = meta?.lastSyncAt ?: "1970-01-01T00:00:00Z"

        val dirtyNotes = db.noteDao().getDirty().map { it.toDto() }
        val dirtyReminders = db.reminderDao().getDirty().map { it.toDto() }

        val response = api.sync(
            SyncRequest(
                device_id = deviceId,
                last_sync_at = lastSync,
                notes = dirtyNotes,
                reminders = dirtyReminders,
            ),
        )

        val mergedNotes = response.notes.map { it.toEntity(userId, isDirty = false) }
        val mergedReminders = response.reminders.map { it.toEntity(userId, isDirty = false) }

        db.noteDao().upsertAll(mergedNotes)
        db.reminderDao().upsertAll(mergedReminders)

        db.syncMetaDao().upsert(
            SyncMetaEntity(
                deviceId = deviceId,
                lastSyncAt = response.server_time,
                userId = userId,
            ),
        )

        reconciler.reconcile()
    }

    fun getDeviceId(): String {
        return kotlinx.coroutines.runBlocking {
            db.syncMetaDao().get()?.deviceId ?: UUID.randomUUID().toString()
        }
    }
}
