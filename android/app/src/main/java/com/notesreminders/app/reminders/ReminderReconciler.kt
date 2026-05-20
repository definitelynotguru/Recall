package com.notesreminders.app.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.notesreminders.app.data.local.ReminderDao
import com.notesreminders.app.data.local.ReminderEntity
import java.time.Instant

class ReminderReconciler(
    private val context: Context,
    private val reminderDao: ReminderDao,
) {
    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    private val registry = AlarmRegistry(context)

    suspend fun reconcile() {
        val active = reminderDao.getActive()
        val scheduled = registry.load()
        val now = Instant.now()

        for (id in scheduled.keys.toList()) {
            val reminder = active.find { it.id == id }
            if (reminder == null || reminder.fireAt != scheduled[id]) {
                cancelAlarm(id)
                scheduled.remove(id)
            }
        }

        for (reminder in active) {
            var fireAt = reminder.fireAt
            val fireInstant = Instant.parse(fireAt)

            if (fireInstant <= now && reminder.repeatRule != null) {
                fireAt = RepeatUtils.computeNextOccurrence(
                    reminder.repeatRule,
                    fireAt,
                    reminder.timezone,
                )
                reminderDao.upsert(
                    reminder.copy(
                        fireAt = fireAt,
                        isDirty = true,
                        updatedAt = Instant.now().toString(),
                    ),
                )
            }

            if (Instant.parse(fireAt) <= now) continue
            if (scheduled[reminder.id] == fireAt) continue

            scheduleAlarm(reminder.id, reminder.noteId, fireAt)
            scheduled[reminder.id] = fireAt
        }

        registry.save(scheduled)
    }

    private fun scheduleAlarm(reminderId: String, noteId: String, fireAtIso: String) {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra(ReminderReceiver.EXTRA_REMINDER_ID, reminderId)
            putExtra(ReminderReceiver.EXTRA_NOTE_ID, noteId)
        }
        val requestCode = reminderId.hashCode()
        val pending = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val trigger = Instant.parse(fireAtIso).toEpochMilli()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    trigger,
                    pending,
                )
            } else {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    trigger,
                    pending,
                )
            }
        } else {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                trigger,
                pending,
            )
        }
    }

    fun cancelAlarm(reminderId: String) {
        val intent = Intent(context, ReminderReceiver::class.java)
        val pending = PendingIntent.getBroadcast(
            context,
            reminderId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        alarmManager.cancel(pending)
    }
}
