package com.notesreminders.app.ui.components

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

fun formatReminderFireAt(iso: String): String {
    val formatter = DateTimeFormatter.ofPattern("EEE, MMM d · h:mm a")
    return Instant.parse(iso).atZone(ZoneId.systemDefault()).format(formatter)
}
