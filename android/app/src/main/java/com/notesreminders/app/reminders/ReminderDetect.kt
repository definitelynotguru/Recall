package com.notesreminders.app.reminders

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.util.Locale

data class DetectedReminder(
    val id: String,
    val fireAt: String,
    val repeatRule: String?,
    val label: String,
    val reason: String,
    val source: String,
    val priority: Int = 0,
)

object ReminderDetect {
    private val months = mapOf(
        "january" to 1, "jan" to 1,
        "february" to 2, "feb" to 2,
        "march" to 3, "mar" to 3,
        "april" to 4, "apr" to 4,
        "may" to 5,
        "june" to 6, "jun" to 6,
        "july" to 7, "jul" to 7,
        "august" to 8, "aug" to 8,
        "september" to 9, "sep" to 9, "sept" to 9,
        "october" to 10, "oct" to 10,
        "november" to 11, "nov" to 11,
        "december" to 12, "dec" to 12,
    )

    private val yearlyKw = Regex(
        "\\b(birthday|b-?day|born|anniversary|every\\s+year|yearly|annual)\\b",
        RegexOption.IGNORE_CASE,
    )
    private val monthlyKw = Regex(
        "\\b(monthly|every\\s+month|each\\s+month|rent\\s+due|pay\\s+day)\\b",
        RegexOption.IGNORE_CASE,
    )
    private val weeklyKw = Regex(
        "\\b(weekly|every\\s+week|each\\s+week|week\\s+on)\\b",
        RegexOption.IGNORE_CASE,
    )
    private val dailyKw = Regex(
        "\\b(daily|every\\s+day|each\\s+day|morning\\s+routine)\\b",
        RegexOption.IGNORE_CASE,
    )

    fun detect(
        title: String,
        body: String,
        defaultHour: Int = 9,
        defaultMinute: Int = 0,
    ): List<DetectedReminder> {
        val trimmedTitle = title.trim()
        val trimmedBody = body.trim()
        if (trimmedTitle.isBlank() && trimmedBody.isBlank()) return emptyList()

        val out = mutableListOf<DetectedReminder>()
        val seen = mutableSetOf<String>()
        val defaults = defaultHour to defaultMinute

        if (trimmedTitle.isNotBlank()) {
            parseTitleLine(trimmedTitle, out, seen, defaults)
            scanPatterns(trimmedTitle, trimmedTitle, out, seen, defaults, priorityBoost = 15)
        }
        if (trimmedBody.isNotBlank()) {
            parseStructured(trimmedBody, trimmedTitle, out, seen, defaults)
            scanPatterns(trimmedBody, trimmedTitle, out, seen, defaults, priorityBoost = 0)
        }

        val cutoff = java.time.Instant.now().minusSeconds(86_400)
        return out
            .filter { java.time.Instant.parse(it.fireAt).isAfter(cutoff) }
            .sortedByDescending { it.priority }
            .take(5)
    }

    fun isDuplicate(
        detected: DetectedReminder,
        existing: List<Pair<String, String?>>,
    ): Boolean {
        val zone = ZoneId.systemDefault()
        val d = java.time.Instant.parse(detected.fireAt).atZone(zone)
        existing.forEach { (fireAt, repeat) ->
            val ex = java.time.Instant.parse(fireAt).atZone(zone)
            if (detected.repeatRule == "yearly" && repeat == "yearly") {
                if (d.monthValue == ex.monthValue && d.dayOfMonth == ex.dayOfMonth) return true
            } else if (kotlin.math.abs(d.toEpochSecond() - ex.toEpochSecond()) < 3600) {
                return true
            }
        }
        return false
    }

    private fun inferRepeat(context: String, title: String): Pair<String?, String> {
        val hay = "$title $context".lowercase(Locale.US)
        when {
            yearlyKw.containsMatchIn(hay) ->
                return "yearly" to "Looks like a birthday or anniversary"
            monthlyKw.containsMatchIn(hay) ->
                return "monthly" to "Repeating monthly event"
            weeklyKw.containsMatchIn(hay) ->
                return "weekly" to "Repeating weekly event"
            dailyKw.containsMatchIn(hay) ->
                return "daily" to "Repeating daily event"
            Regex("\\bbirthday\\b", RegexOption.IGNORE_CASE).containsMatchIn(title) ->
                return "yearly" to "Title mentions birthday"
        }
        return null to "One-time reminder"
    }

    private fun parseTitleLine(
        title: String,
        out: MutableList<DetectedReminder>,
        seen: MutableSet<String>,
        defaults: Pair<Int, Int>,
    ) {
        val sep = Regex("""^(.+?)\s*(?:—|-|\|)\s*(.+)$""").find(title) ?: return
        val label = sep.groupValues[1].trim()
        val datePart = sep.groupValues[2].trim()
        val inner = mutableListOf<DetectedReminder>()
        val innerSeen = mutableSetOf<String>()
        scanPatterns(datePart, label, inner, innerSeen, defaults, priorityBoost = 25)
        inner.forEach { r ->
            if (seen.add(r.id)) out.add(r.copy(label = label, priority = r.priority + 5))
        }
    }

    private fun parseStructured(
        text: String,
        title: String,
        out: MutableList<DetectedReminder>,
        seen: MutableSet<String>,
        defaults: Pair<Int, Int>,
    ) {
        text.split(Regex("\n{2,}")).forEach { block ->
            val dayM = Regex("""(?:^|\n)\s*(?:day|date)\s*[:=]\s*(\d{1,2})""", RegexOption.IGNORE_CASE)
                .find(block) ?: return@forEach
            val monthM = Regex("""(?:^|\n)\s*month\s*[:=]\s*([A-Za-z]+|\d{1,2})""", RegexOption.IGNORE_CASE)
                .find(block) ?: return@forEach
            val yearM = Regex("""(?:^|\n)\s*year\s*[:=]\s*(\d{2,4})""", RegexOption.IGNORE_CASE)
                .find(block) ?: return@forEach
            val timeM = Regex("""(?:^|\n)\s*time\s*[:=]\s*([^\n]+)""", RegexOption.IGNORE_CASE)
                .find(block)

            val day = dayM.groupValues[1].toIntOrNull() ?: return@forEach
            val month = monthFrom(monthM.groupValues[1]) ?: return@forEach
            val year = resolveYear(yearM.groupValues[1].toIntOrNull() ?: return@forEach)
            val time = timeM?.groupValues?.get(1)?.let { parseTime(it) }

            val (repeat, reason) = inferRepeat(block, title)
            push(
                out, seen, year, month, day,
                time?.first, time?.second,
                title.ifBlank { "Reminder · $day/$month/$year" },
                reason, block.trim(), repeat, 20, defaults,
            )
        }
    }

    private fun scanPatterns(
        text: String,
        title: String,
        out: MutableList<DetectedReminder>,
        seen: MutableSet<String>,
        defaults: Pair<Int, Int>,
        priorityBoost: Int = 0,
    ) {
        Regex("""\b(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?""", RegexOption.IGNORE_CASE)
            .findAll(text).forEach { m ->
                val ctx = contextAround(text, m.range.first)
                val (repeat, reason) = inferRepeat(ctx, title)
                push(
                    out, seen,
                    m.groupValues[1].toInt(), m.groupValues[2].toInt(), m.groupValues[3].toInt(),
                    m.groupValues[4].toIntOrNull(),
                    m.groupValues[5].toIntOrNull(),
                    title.ifBlank { m.value }, reason, m.value, repeat, 10 + priorityBoost, defaults,
                )
            }

        Regex(
            """\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\s+(\d{2,4})(?:,?\s*(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?""",
            RegexOption.IGNORE_CASE,
        ).findAll(text).forEach { m ->
            val month = monthFrom(m.groupValues[2]) ?: return@forEach
            val time = m.groupValues.getOrNull(4)?.let { parseTime(it) }
            val ctx = contextAround(text, m.range.first)
            val (repeat, reason) = inferRepeat(ctx, title)
            push(
                out, seen,
                resolveYear(m.groupValues[3].toInt()), month, m.groupValues[1].toInt(),
                time?.first, time?.second,
                title.ifBlank { m.value }, reason, m.value, repeat, 10 + priorityBoost, defaults,
            )
        }

        Regex(
            """\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})(?:,?\s*(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?""",
            RegexOption.IGNORE_CASE,
        ).findAll(text).forEach { m ->
            val month = monthFrom(m.groupValues[1]) ?: return@forEach
            val time = m.groupValues.getOrNull(4)?.let { parseTime(it) }
            val ctx = contextAround(text, m.range.first)
            val (repeat, reason) = inferRepeat(ctx, title)
            push(
                out, seen,
                resolveYear(m.groupValues[3].toInt()), month, m.groupValues[2].toInt(),
                time?.first, time?.second,
                title.ifBlank { m.value }, reason, m.value, repeat, 10 + priorityBoost, defaults,
            )
        }
    }

    private fun push(
        out: MutableList<DetectedReminder>,
        seen: MutableSet<String>,
        year: Int,
        month: Int,
        day: Int,
        hour: Int?,
        minute: Int?,
        label: String,
        reason: String,
        source: String,
        repeat: String?,
        priority: Int,
        defaults: Pair<Int, Int>,
    ) {
        val usedDefault = hour == null
        val h = hour ?: defaults.first
        val min = minute ?: defaults.second
        if (month !in 1..12 || day !in 1..31) return
        val zone = ZoneId.systemDefault()
        val ldt = try {
            LocalDateTime.of(LocalDate.of(year, month, day), LocalTime.of(h.coerceIn(0, 23), min.coerceIn(0, 59)))
        } catch (_: Exception) {
            return
        }
        val fireAt = ldt.atZone(zone).toInstant().toString()
        val id = "$year-$month-$day-$h$min-${repeat ?: "once"}"
        if (!seen.add(id)) return
        var finalReason = reason
        if (usedDefault) finalReason += " · No time found — using default"
        out.add(
            DetectedReminder(
                id = id,
                fireAt = fireAt,
                repeatRule = repeat,
                label = label,
                reason = finalReason,
                source = source.take(120),
                priority = priority,
            ),
        )
    }

    private fun monthFrom(token: String): Int? {
        token.toIntOrNull()?.takeIf { it in 1..12 }?.let { return it }
        return months[token.lowercase(Locale.US)]
    }

    private fun resolveYear(y: Int): Int = if (y < 100) if (y >= 70) 1900 + y else 2000 + y else y

    private fun parseTime(raw: String): Pair<Int, Int>? {
        val t = raw.trim().lowercase(Locale.US)
        Regex("""^(\d{1,2}):(\d{2})$""").find(t)?.let {
            return it.groupValues[1].toInt() to it.groupValues[2].toInt()
        }
        Regex("""^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$""").find(t)?.let {
            var h = it.groupValues[1].toInt()
            val min = it.groupValues[2].toIntOrNull() ?: 0
            if (h == 12) h = 0
            if (it.groupValues[3] == "pm") h += 12
            return h to min
        }
        return null
    }

    private fun contextAround(text: String, index: Int, radius: Int = 120): String {
        val start = (index - radius).coerceAtLeast(0)
        val end = (index + radius).coerceAtMost(text.length)
        return text.substring(start, end)
    }
}
