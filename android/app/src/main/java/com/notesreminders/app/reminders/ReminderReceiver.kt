package com.notesreminders.app.reminders

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.notesreminders.app.MainActivity
import com.notesreminders.app.NotesApp
import com.notesreminders.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val reminderId = intent.getStringExtra(EXTRA_REMINDER_ID) ?: return
        val noteId = intent.getStringExtra(EXTRA_NOTE_ID) ?: return
        val action = intent.action

        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                when (action) {
                    ACTION_DONE -> handleDone(context, reminderId)
                    ACTION_SNOOZE -> handleSnooze(context, reminderId)
                    else -> showNotification(context, reminderId, noteId)
                }
            } finally {
                pending.finish()
            }
        }
    }

    private suspend fun showNotification(
        context: Context,
        reminderId: String,
        noteId: String,
    ) {
        val app = context.applicationContext as NotesApp
        val note = app.database.noteDao().getById(noteId)
        val title = note?.title?.ifBlank { "Reminder" } ?: "Reminder"
        val body = note?.body?.take(120) ?: ""

        createChannel(context)

        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_NOTE_ID, noteId)
        }
        val openPending = PendingIntent.getActivity(
            context,
            reminderId.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val doneIntent = Intent(context, ReminderReceiver::class.java).apply {
            action = ACTION_DONE
            putExtra(EXTRA_REMINDER_ID, reminderId)
            putExtra(EXTRA_NOTE_ID, noteId)
        }
        val donePending = PendingIntent.getBroadcast(
            context,
            (reminderId + "done").hashCode(),
            doneIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val snoozeIntent = Intent(context, ReminderReceiver::class.java).apply {
            action = ACTION_SNOOZE
            putExtra(EXTRA_REMINDER_ID, reminderId)
            putExtra(EXTRA_NOTE_ID, noteId)
        }
        val snoozePending = PendingIntent.getBroadcast(
            context,
            (reminderId + "snooze").hashCode(),
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body.ifBlank { "Tap to open note" })
            .setContentIntent(openPending)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .addAction(0, context.getString(R.string.action_done), donePending)
            .addAction(0, context.getString(R.string.action_snooze), snoozePending)
            .build()

        NotificationManagerCompat.from(context).notify(reminderId.hashCode(), notification)
    }

    private suspend fun handleDone(context: Context, reminderId: String) {
        val app = context.applicationContext as NotesApp
        val reminder = app.database.reminderDao().getById(reminderId) ?: return
        val reconciler = ReminderReconciler(context, app.database.reminderDao())

        reconciler.cancelAlarm(reminderId)

        try {
            app.api.completeReminder(reminderId)
        } catch (_: Exception) {
            val now = java.time.Instant.now().toString()
            if (reminder.repeatRule != null) {
                val next = RepeatUtils.computeNextOccurrence(
                    reminder.repeatRule,
                    reminder.fireAt,
                    reminder.timezone,
                )
                app.database.reminderDao().upsert(
                    reminder.copy(
                        fireAt = next,
                        status = "active",
                        isDirty = true,
                        updatedAt = now,
                    ),
                )
            } else {
                app.database.reminderDao().upsert(
                    reminder.copy(
                        status = "completed",
                        completedAt = now,
                        isDirty = true,
                        updatedAt = now,
                    ),
                )
            }
            app.syncRepository.sync()
            return
        }

        app.syncRepository.sync()
        reconciler.reconcile()
        NotificationManagerCompat.from(context).cancel(reminderId.hashCode())
    }

    private suspend fun handleSnooze(context: Context, reminderId: String) {
        val app = context.applicationContext as NotesApp
        val snoozeUntil = java.time.Instant.now().plusSeconds(3600).toString()

        try {
            app.api.snoozeReminder(reminderId, com.notesreminders.app.data.api.SnoozeRequest(snoozeUntil))
        } catch (_: Exception) {
            val reminder = app.database.reminderDao().getById(reminderId) ?: return
            app.database.reminderDao().upsert(
                reminder.copy(
                    fireAt = snoozeUntil,
                    status = "active",
                    isDirty = true,
                    updatedAt = java.time.Instant.now().toString(),
                ),
            )
        }

        app.syncRepository.sync()
        ReminderReconciler(context, app.database.reminderDao()).reconcile()
        NotificationManagerCompat.from(context).cancel(reminderId.hashCode())
    }

    private fun createChannel(context: Context) {
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.reminder_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = context.getString(R.string.reminder_channel_desc)
        }
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(channel)
    }

    companion object {
        const val EXTRA_REMINDER_ID = "reminder_id"
        const val EXTRA_NOTE_ID = "note_id"
        const val CHANNEL_ID = "reminders"
        const val ACTION_DONE = "com.notesreminders.app.ACTION_DONE"
        const val ACTION_SNOOZE = "com.notesreminders.app.ACTION_SNOOZE"
    }
}
