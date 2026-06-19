package com.notesreminders.app.reminders

import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

object RepeatUtils {
    private data class Rule(
        val freq: String,
        val interval: Long,
        val days: Set<Int> = emptySet(),
        val day: Int? = null,
        val month: Int? = null,
    )

    private val weekdays = mapOf(
        "MO" to 1,
        "TU" to 2,
        "WE" to 3,
        "TH" to 4,
        "FR" to 5,
        "SA" to 6,
        "SU" to 7,
    )

    fun computeNextOccurrence(
        repeatRule: String,
        fireAtIso: String,
        timezone: String,
    ): String {
        val zone = ZoneId.of(timezone)
        val current = Instant.parse(fireAtIso).atZone(zone)
        val rule = parseRule(repeatRule) ?: return current.toInstant().toString()
        val next = when (rule.freq) {
            "daily" -> current.plusDays(rule.interval)
            "weekly" -> nextWeekly(current, rule)
            "monthly" -> addMonths(current, rule.interval, rule.day)
            "yearly" -> addYears(current, rule.interval, rule.month, rule.day)
            else -> current
        }
        return next.toInstant().toString()
    }

    private fun parseRule(raw: String): Rule? {
        val text = raw.trim()
        when (text.lowercase()) {
            "daily", "weekly", "monthly", "yearly" -> return Rule(text.lowercase(), 1)
        }

        val parts = text.split(";").mapNotNull { token ->
            val pair = token.split("=", limit = 2)
            if (pair.size == 2) pair[0].trim().lowercase() to pair[1].trim() else null
        }.toMap()

        val freq = parts["freq"]?.lowercase()
        if (freq !in setOf("daily", "weekly", "monthly", "yearly")) return null
        val interval = parts["interval"]?.toLongOrNull()?.takeIf { it > 0 }?.coerceAtMost(365) ?: 1
        val days = parts["days"]
            ?.split(",")
            ?.mapNotNull { weekdays[it.trim().uppercase()] }
            ?.toSet()
            ?: emptySet()
        val day = parts["day"]?.toIntOrNull()?.takeIf { it in 1..31 }
        val month = parts["month"]?.toIntOrNull()?.takeIf { it in 1..12 }
        return Rule(freq!!, interval, days, day, month)
    }

    private fun nextWeekly(current: ZonedDateTime, rule: Rule): ZonedDateTime {
        if (rule.days.isNotEmpty()) {
            for (delta in 1..(7 * rule.interval).toInt()) {
                val candidate = current.plusDays(delta.toLong())
                if (candidate.dayOfWeek.value in rule.days) return candidate
            }
        }
        return current.plusWeeks(rule.interval)
    }

    private fun addMonths(current: ZonedDateTime, months: Long, day: Int?): ZonedDateTime {
        val next = current.plusMonths(months)
        val targetDay = (day ?: current.dayOfMonth).coerceAtMost(next.toLocalDate().lengthOfMonth())
        return next.withDayOfMonth(targetDay)
    }

    private fun addYears(current: ZonedDateTime, years: Long, month: Int?, day: Int?): ZonedDateTime {
        val next = current.plusYears(years).let { value ->
            if (month != null) value.withMonth(month) else value
        }
        val targetDay = (day ?: current.dayOfMonth).coerceAtMost(next.toLocalDate().lengthOfMonth())
        return next.withDayOfMonth(targetDay)
    }

    fun formatRepeatLabel(raw: String?): String {
        val text = raw?.trim().orEmpty()
        if (text.isEmpty()) return "Once"
        val rule = parseRule(text) ?: return text
        val freqLabel = when (rule.freq) {
            "daily" -> if (rule.interval == 1L) "Daily" else "Every ${rule.interval} days"
            "weekly" -> {
                val dayNames = rule.days.sorted().map { day ->
                    when (day) {
                        1 -> "Mon"; 2 -> "Tue"; 3 -> "Wed"; 4 -> "Thu"
                        5 -> "Fri"; 6 -> "Sat"; 7 -> "Sun"; else -> ""
                    }
                }.filter { it.isNotEmpty() }
                when {
                    dayNames.isNotEmpty() -> "Weekly · ${dayNames.joinToString(", ")}"
                    rule.interval == 1L -> "Weekly"
                    else -> "Every ${rule.interval} weeks"
                }
            }
            "monthly" -> if (rule.interval == 1L) "Monthly" else "Every ${rule.interval} months"
            "yearly" -> if (rule.interval == 1L) "Yearly" else "Every ${rule.interval} years"
            else -> text
        }
        return freqLabel
    }
}
