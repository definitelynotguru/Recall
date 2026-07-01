package com.notesreminders.app.reminders

import android.app.AlarmManager
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
import java.time.Instant
import java.time.ZonedDateTime
import java.time.ZoneId

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
                    ACTION_SNOOZE -> {
                        val snoozeUntil = intent.getStringExtra(EXTRA_SNOOZE_UNTIL)
                        handleSnooze(context, reminderId, snoozeUntil)
                    }
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

        // Smart snooze: +30 min
        val snooze30Intent = Intent(context, ReminderReceiver::class.java).apply {
            action = ACTION_SNOOZE
            putExtra(EXTRA_REMINDER_ID, reminderId)
            putExtra(EXTRA_NOTE_ID, noteId)
            putExtra(EXTRA_SNOOZE_UNTIL, Instant.now().plusSeconds(1800).toString())
        }
        val snooze30Pending = PendingIntent.getBroadcast(
            context,
            (reminderId + "snooze30").hashCode(),
            snooze30Intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        // Smart snooze: Tonight 7pm or Tomorrow 9am based on current time
        val now = ZonedDateTime.now(ZoneId.systemDefault())
        val isPast5pm = now.hour >= 17
        val smartSnoozeTime = if (isPast5pm) {
            now.withHour(19).withMinute(0).withSecond(0).withNano(0)
                .let { if (it.isBefore(now)) it.plusDays(1) else it }
        } else {
            now.plusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0)
        }
        val smartSnoozeLabel = if (isPast5pm)
            context.getString(R.string.action_snooze_tonight)
        else
            context.getString(R.string.action_snooze_tomorrow)

        val smartSnoozeIntent = Intent(context, ReminderReceiver::class.java).apply {
            action = ACTION_SNOOZE
            putExtra(EXTRA_REMINDER_ID, reminderId)
            putExtra(EXTRA_NOTE_ID, noteId)
            putExtra(EXTRA_SNOOZE_UNTIL, smartSnoozeTime.toInstant().toString())
        }
        val smartSnoozePending = PendingIntent.getBroadcast(
            context,
            (reminderId + "snooze_smart").hashCode(),
            smartSnoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setColor(0xFFEF6F2E.toInt())
            .setContentTitle(title)
            .setContentText(body.ifBlank { "Tap to open note" })
            .setContentIntent(openPending)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setGroup(NotificationChannels.GROUP_KEY)
            .addAction(0, context.getString(R.string.action_done), donePending)
            .addAction(0, context.getString(R.string.action_snooze_30m), snooze30Pending)
            .addAction(0, smartSnoozeLabel, smartSnoozePending)
            .addAction(0, context.getString(R.string.action_snooze), snoozePending)
            .build()

        val nm = NotificationManagerCompat.from(context)
        if (!nm.areNotificationsEnabled()) return

        try {
            nm.notify(reminderId.hashCode(), notification)
        } catch (_: SecurityException) {
            return
        }

        // Persistent nag: schedule a follow-up alarm that re-fires this receiver,
        // creating a nag chain until the user marks the reminder done.
        val reminder = app.database.reminderDao().getById(reminderId)
        if (reminder != null && reminder.reminderMode == "persistent") {
            val nagInterval = reminder.nagIntervalMinutes ?: 5
            val triggerAt = Instant.now().plusSeconds(nagInterval * 60L)

            val nagIntent = Intent(context, ReminderReceiver::class.java).apply {
                putExtra(EXTRA_REMINDER_ID, reminderId)
                putExtra(EXTRA_NOTE_ID, noteId)
            }
            val nagPending = PendingIntent.getBroadcast(
                context,
                (reminderId + "nag").hashCode(),
                nagIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

            val showIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(EXTRA_NOTE_ID, noteId)
            }
            val showPending = PendingIntent.getActivity(
                context,
                (reminderId + "show").hashCode(),
                showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

            val alarmManager =
                context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.setAlarmClock(
                AlarmManager.AlarmClockInfo(triggerAt.toEpochMilli(), showPending),
                nagPending,
            )
        }

        ReminderReconciler(context, app.database.reminderDao()).reconcile()
    }

    private suspend fun handleDone(context: Context, reminderId: String) {
        val app = context.applicationContext as NotesApp
        app.notesRepository.completeReminder(reminderId)
        NotificationManagerCompat.from(context).cancel(reminderId.hashCode())
    }

    private suspend fun handleSnooze(context: Context, reminderId: String, snoozeUntilIso: String?) {
        val app = context.applicationContext as NotesApp
        val snoozeUntil = snoozeUntilIso ?: java.time.Instant.now().plusSeconds(3600).toString()
        app.notesRepository.snoozeReminder(reminderId, snoozeUntil)
        NotificationManagerCompat.from(context).cancel(reminderId.hashCode())
    }

    private fun createChannel(context: Context) {
        NotificationChannels.ensureChannels(context)
    }

    companion object {
        const val EXTRA_REMINDER_ID = "reminder_id"
        const val EXTRA_NOTE_ID = "note_id"
        const val EXTRA_SNOOZE_UNTIL = "snooze_until"
        const val CHANNEL_ID = "reminders"
        const val ACTION_DONE = "com.notesreminders.app.ACTION_DONE"
        const val ACTION_SNOOZE = "com.notesreminders.app.ACTION_SNOOZE"
    }
}
