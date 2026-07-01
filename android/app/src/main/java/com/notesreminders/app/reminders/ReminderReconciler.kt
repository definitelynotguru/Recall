package com.notesreminders.app.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.notesreminders.app.MainActivity
import com.notesreminders.app.data.local.ReminderDao
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
        var skippedPast = 0
        var advancedRepeat = 0
        var newlyScheduled = 0
        val issues = mutableListOf<String>()

        for (id in scheduled.keys.toList()) {
            val reminder = active.find { it.id == id }
            if (reminder == null || reminder.fireAt != scheduled[id]) {
                cancelAlarm(id)
                scheduled.remove(id)
            }
        }

        for (reminder in active) {
            var fireAt = reminder.fireAt
            val fireInstant = try {
                Instant.parse(fireAt)
            } catch (e: Exception) {
                issues.add("bad fire_at ${reminder.id}: ${e.message}")
                continue
            }

            if (fireInstant <= now && reminder.repeatRule != null) {
                fireAt = RepeatUtils.computeNextOccurrence(
                    reminder.repeatRule,
                    fireAt,
                    reminder.timezone,
                )
                advancedRepeat++
                reminderDao.upsert(
                    reminder.copy(
                        fireAt = fireAt,
                        isDirty = true,
                        updatedAt = Instant.now().toString(),
                    ),
                )
            }

            if (Instant.parse(fireAt) <= now) {
                skippedPast++
                continue
            }
            if (scheduled[reminder.id] == fireAt) continue

            val method = scheduleAlarm(reminder.id, reminder.noteId, fireAt)
            scheduled[reminder.id] = fireAt
            newlyScheduled++
            if (newlyScheduled == 1) {
                ReminderDiagnostics.lastScheduleMethod = method
            }
        }

        registry.save(scheduled)

        val exact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }
        ReminderDiagnostics.recordReconcile(
            active = active.size,
            scheduled = scheduled.size,
            skippedPast = skippedPast,
            advancedRepeat = advancedRepeat,
            exactAlarms = exact,
            scheduleMethod = ReminderDiagnostics.lastScheduleMethod ?: "none",
            issues = issues,
        )
    }

    private fun scheduleAlarm(reminderId: String, noteId: String, fireAtIso: String): String {
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

        val showIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(ReminderReceiver.EXTRA_NOTE_ID, noteId)
        }
        val showPending = PendingIntent.getActivity(
            context,
            (reminderId + "show").hashCode(),
            showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        // Alarm clock alarms are exempt from exact-alarm permission and fire on time in Doze.
        alarmManager.setAlarmClock(
            AlarmManager.AlarmClockInfo(trigger, showPending),
            pending,
        )
        return "alarm_clock"
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

        // Also cancel any pending nag follow-up alarm.
        val nagPending = PendingIntent.getBroadcast(
            context,
            (reminderId + "nag").hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        alarmManager.cancel(nagPending)
    }
}
