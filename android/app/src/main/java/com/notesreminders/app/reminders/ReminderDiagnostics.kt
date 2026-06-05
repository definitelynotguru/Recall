package com.notesreminders.app.reminders

/** In-memory reminder/alarm diagnostics for debug reports (no PII). */
object ReminderDiagnostics {
    var lastReconcileAt: String? = null
    var activeReminderCount: Int = 0
    var scheduledAlarmCount: Int = 0
    var skippedPastCount: Int = 0
    var advancedRepeatCount: Int = 0
    var canScheduleExactAlarms: Boolean? = null
    var lastScheduleMethod: String? = null
    val lastIssues: MutableList<String> = mutableListOf()

    fun recordReconcile(
        active: Int,
        scheduled: Int,
        skippedPast: Int,
        advancedRepeat: Int,
        exactAlarms: Boolean,
        scheduleMethod: String,
        issues: List<String> = emptyList(),
    ) {
        lastReconcileAt = java.time.Instant.now().toString()
        activeReminderCount = active
        scheduledAlarmCount = scheduled
        skippedPastCount = skippedPast
        advancedRepeatCount = advancedRepeat
        canScheduleExactAlarms = exactAlarms
        lastScheduleMethod = scheduleMethod
        lastIssues.clear()
        lastIssues.addAll(issues.take(20))
    }
}
