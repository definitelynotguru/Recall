package com.notesreminders.app.debug

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.notesreminders.app.BuildConfig
import com.notesreminders.app.reminders.ReminderPermissions

object EnvironmentDiagnostics {
    fun collect(context: Context): Map<String, Any?> {
        val nm = NotificationManagerCompat.from(context)
        val alarmManager = ContextCompat.getSystemService(context, AlarmManager::class.java)
        val powerManager = ContextCompat.getSystemService(context, PowerManager::class.java)

        val notificationPerm = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        return mapOf(
            "version_code" to BuildConfig.VERSION_CODE,
            "version_name" to BuildConfig.VERSION_NAME,
            "api_base_url" to BuildConfig.API_BASE_URL,
            "update_apk_url" to BuildConfig.UPDATE_APK_URL,
            "notifications_enabled" to nm.areNotificationsEnabled(),
            "post_notifications_granted" to notificationPerm,
            "can_schedule_exact_alarms" to (
                alarmManager?.let {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        it.canScheduleExactAlarms()
                    } else {
                        true
                    }
                } ?: false
                ),
            "needs_exact_alarm_settings" to ReminderPermissions.needsExactAlarmPermission(context),
            "battery_optimization_ignored" to (
                powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: false
            ),
            "default_notification_importance" to defaultChannelImportance(context),
        )
    }

    private fun defaultChannelImportance(context: Context): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return "pre_oem"
        val nm = context.getSystemService(NotificationManager::class.java) ?: return "unknown"
        val channel = nm.getNotificationChannel("reminders") ?: return "channel_missing"
        return when (channel.importance) {
            NotificationManager.IMPORTANCE_NONE -> "none"
            NotificationManager.IMPORTANCE_MIN -> "min"
            NotificationManager.IMPORTANCE_LOW -> "low"
            NotificationManager.IMPORTANCE_DEFAULT -> "default"
            NotificationManager.IMPORTANCE_HIGH -> "high"
            NotificationManager.IMPORTANCE_MAX -> "max"
            else -> "unknown"
        }
    }
}
