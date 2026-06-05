package com.notesreminders.app.ui.components

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

enum class ReminderQuickPick {
    PLUS_10_MIN,
    PLUS_1_HOUR,
    TONIGHT,
    TOMORROW,
}

fun applyReminderQuickPick(
    pick: ReminderQuickPick,
    defaultHour: Int,
    defaultMinute: Int,
    onDateChange: (String) -> Unit,
    onTimeChange: (hour24: Int, minute: Int) -> Unit,
) {
    val zone = ZoneId.systemDefault()
    when (pick) {
        ReminderQuickPick.PLUS_10_MIN -> {
            val target = LocalDateTime.now(zone).plusMinutes(10)
            onDateChange(target.toLocalDate().toString())
            onTimeChange(target.hour, target.minute)
        }
        ReminderQuickPick.PLUS_1_HOUR -> {
            val target = LocalDateTime.now(zone).plusHours(1)
            onDateChange(target.toLocalDate().toString())
            onTimeChange(target.hour, target.minute)
        }
        ReminderQuickPick.TONIGHT -> {
            onDateChange(LocalDate.now(zone).toString())
            onTimeChange(20, 0)
        }
        ReminderQuickPick.TOMORROW -> {
            onDateChange(LocalDate.now(zone).plusDays(1).toString())
            onTimeChange(defaultHour.coerceIn(0, 23), defaultMinute.coerceIn(0, 59))
        }
    }
}
