package com.notesreminders.app.data

import android.content.Context
import androidx.core.content.edit

class UserPrefs(context: Context) {
    private val prefs = context.getSharedPreferences("recall_prefs", Context.MODE_PRIVATE)

    var defaultReminderHour: Int
        get() = prefs.getInt(KEY_HOUR, 9).coerceIn(0, 23)
        set(v) = prefs.edit { putInt(KEY_HOUR, v.coerceIn(0, 23)) }

    var defaultReminderMinute: Int
        get() = prefs.getInt(KEY_MINUTE, 0).coerceIn(0, 59)
        set(v) = prefs.edit { putInt(KEY_MINUTE, v.coerceIn(0, 59)) }

    var autoSyncAfterReminder: Boolean
        get() = prefs.getBoolean(KEY_AUTO_SYNC, true)
        set(v) = prefs.edit { putBoolean(KEY_AUTO_SYNC, v) }

    var onboardingDone: Boolean
        get() = prefs.getBoolean(KEY_ONBOARDING, false)
        set(v) = prefs.edit { putBoolean(KEY_ONBOARDING, v) }

    companion object {
        private const val KEY_HOUR = "default_reminder_hour"
        private const val KEY_MINUTE = "default_reminder_minute"
        private const val KEY_AUTO_SYNC = "auto_sync_after_reminder"
        private const val KEY_ONBOARDING = "onboarding_done"
    }
}
