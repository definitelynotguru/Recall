package com.notesreminders.app.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.notesreminders.app.data.local.ReminderEntity
import java.time.LocalDate
import java.time.ZoneId

class ReminderScheduleState(
    defaultHour: Int,
    defaultMinute: Int,
) {
    var showDialog by mutableStateOf(false)
    var editingReminder by mutableStateOf<ReminderEntity?>(null)
    var reminderDate by mutableStateOf(LocalDate.now().toString())
    var reminderHour by mutableStateOf(defaultHour)
    var reminderMinute by mutableStateOf(defaultMinute)
    var repeatRule by mutableStateOf("")

    fun openNew(defaultHour: Int, defaultMinute: Int) {
        editingReminder = null
        val tomorrow = LocalDate.now().plusDays(1)
        reminderDate = tomorrow.toString()
        reminderHour = defaultHour
        reminderMinute = defaultMinute
        repeatRule = ""
        showDialog = true
    }

    fun openEdit(reminder: ReminderEntity) {
        editingReminder = reminder
        val (d, h, m) = parseReminderTimeFields(reminder.fireAt)
        reminderDate = d
        reminderHour = h
        reminderMinute = m
        repeatRule = reminder.repeatRule ?: ""
        showDialog = true
    }

    fun dismiss() {
        showDialog = false
        editingReminder = null
    }

    fun fireAtAndTimezone(): Pair<String, String> {
        val zone = ZoneId.systemDefault()
        val local = LocalDate.parse(reminderDate)
            .atTime(reminderHour.coerceIn(0, 23), reminderMinute.coerceIn(0, 59))
            .atZone(zone)
        return local.toInstant().toString() to zone.id
    }
}

@Composable
fun rememberReminderScheduleState(
    defaultHour: Int,
    defaultMinute: Int,
): ReminderScheduleState = remember(defaultHour, defaultMinute) {
    ReminderScheduleState(defaultHour, defaultMinute)
}
