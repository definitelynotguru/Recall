package com.notesreminders.app.reminders

import android.app.NotificationChannel
import android.app.NotificationChannelGroup
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.content.getSystemService
import com.notesreminders.app.R

object NotificationChannels {
    const val GROUP_KEY = "recall_notifications"
    const val REMINDERS = "reminders"
    const val SYNC_ALERTS = "sync_alerts"
    const val BACKUP = "backup"

    fun ensureChannels(context: Context) {
        val nm = context.getSystemService<NotificationManager>() ?: return

        nm.createNotificationChannelGroup(
            NotificationChannelGroup(GROUP_KEY, context.getString(R.string.notification_group_name)),
        )

        val reminders = NotificationChannel(
            REMINDERS,
            context.getString(R.string.reminder_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = context.getString(R.string.reminder_channel_desc)
            group = GROUP_KEY
        }

        val syncAlerts = NotificationChannel(
            SYNC_ALERTS,
            context.getString(R.string.sync_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = context.getString(R.string.sync_channel_desc)
            group = GROUP_KEY
        }

        val backup = NotificationChannel(
            BACKUP,
            context.getString(R.string.backup_channel_name),
            NotificationManager.IMPORTANCE_MIN,
        ).apply {
            description = context.getString(R.string.backup_channel_desc)
            group = GROUP_KEY
        }

        nm.createNotificationChannels(listOf(reminders, syncAlerts, backup))
    }

    fun groupAvailable(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
}
