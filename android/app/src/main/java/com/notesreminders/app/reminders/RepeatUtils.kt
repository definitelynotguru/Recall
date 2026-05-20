package com.notesreminders.app.reminders

import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

object RepeatUtils {
    fun computeNextOccurrence(
        repeatRule: String,
        fireAtIso: String,
        timezone: String,
    ): String {
        val zone = ZoneId.of(timezone)
        val current = Instant.parse(fireAtIso).atZone(zone)
        val next = when (repeatRule) {
            "daily" -> current.plusDays(1)
            "weekly" -> current.plusWeeks(1)
            "monthly" -> current.plusMonths(1)
            "yearly" -> current.plusYears(1)
            else -> current
        }
        return next.toInstant().toString()
    }
}
