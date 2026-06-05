package com.notesreminders.app.reminders

import java.time.Instant
import java.time.ZoneId
import java.util.Locale
import java.util.regex.Pattern

/**
 * Table-driven duration / vague-time parsing. Keep in sync with [shared/duration-patterns.json].
 */
internal object DurationPatternScanner {
    private val numberWords = mapOf(
        "a" to 1, "an" to 1, "one" to 1, "two" to 2, "three" to 3, "four" to 4,
        "five" to 5, "six" to 6, "seven" to 7, "eight" to 8, "nine" to 9,
        "ten" to 10, "eleven" to 11, "twelve" to 12,
    )

    private data class Rule(
        val regex: Pattern,
        val resolve: ResolveKind,
        /** 0 when the pattern has no capturing group for `{n}` substitution. */
        val captureGroup: Int = 0,
        val min: Int = 1,
        val max: Int = Int.MAX_VALUE,
        val seconds: Long = 0,
        val days: Int = 0,
        val priority: Int,
        val confidence: DetectConfidence,
        val reason: String,
    )

    private enum class ResolveKind {
        PLUS_MINUTES,
        PLUS_SECONDS,
        PLUS_HOURS,
        EVENING_TODAY,
        TOMORROW_DEFAULT,
        PLUS_DAYS_DEFAULT,
    }

    private val rules: List<Rule> = listOf(
        Rule(
            regex = pattern("""\b(?:remind\s+me\s+)?(?:in|after)\s+(?:about|around|roughly)?\s*(\d{1,3}|[a-z]+)\s*(?:minute|min|mins|minutes)\b"""),
            resolve = ResolveKind.PLUS_MINUTES,
            captureGroup = 1,
            min = 1,
            max = 999,
            priority = 18,
            confidence = DetectConfidence.HIGH,
            reason = "Duration: in {n} minute(s)",
        ),
        Rule(
            regex = pattern("""\bin\s+(?:about\s+)?half\s+(?:an?\s+)?hour\b"""),
            resolve = ResolveKind.PLUS_SECONDS,
            seconds = 1800,
            priority = 17,
            confidence = DetectConfidence.HIGH,
            reason = "Duration: half an hour",
        ),
        Rule(
            regex = pattern("""\b(?:in|after)\s+(?:an?\s+)?hour\b"""),
            resolve = ResolveKind.PLUS_SECONDS,
            seconds = 3600,
            priority = 17,
            confidence = DetectConfidence.HIGH,
            reason = "Duration: in one hour",
        ),
        Rule(
            regex = pattern("""\b(?:in|after)\s+(?:about|around)?\s*(\d{1,2}|[a-z]+)\s+hours?\b"""),
            resolve = ResolveKind.PLUS_HOURS,
            captureGroup = 1,
            min = 1,
            max = 48,
            priority = 17,
            confidence = DetectConfidence.HIGH,
            reason = "Duration: in {n} hour(s)",
        ),
        Rule(
            regex = pattern("""\blater\s+today\b"""),
            resolve = ResolveKind.PLUS_SECONDS,
            seconds = 10800,
            priority = 10,
            confidence = DetectConfidence.MAYBE,
            reason = "Vague: later today",
        ),
        Rule(
            regex = pattern("""\btonight\b"""),
            resolve = ResolveKind.EVENING_TODAY,
            priority = 10,
            confidence = DetectConfidence.MAYBE,
            reason = "Vague: tonight",
        ),
        Rule(
            regex = pattern("""\btomorrow\s+morning\b"""),
            resolve = ResolveKind.TOMORROW_DEFAULT,
            priority = 12,
            confidence = DetectConfidence.HIGH,
            reason = "Relative: tomorrow morning",
        ),
        Rule(
            regex = pattern("""\bnext\s+week\b"""),
            resolve = ResolveKind.PLUS_DAYS_DEFAULT,
            days = 7,
            priority = 9,
            confidence = DetectConfidence.MAYBE,
            reason = "Relative: next week",
        ),
    )

    fun scan(
        text: String,
        title: String,
        reference: Instant,
        defaults: Pair<Int, Int>,
        emit: (
            matchText: String,
            matchIndex: Int,
            fireAt: Instant,
            reason: String,
            priority: Int,
            confidence: DetectConfidence,
        ) -> Unit,
    ) {
        val zone = ZoneId.systemDefault()
        val zonedNow = reference.atZone(zone)

        for (rule in rules) {
            val matcher = rule.regex.matcher(text)
            while (matcher.find()) {
                val target = resolveTarget(rule, matcher, reference, zonedNow, defaults) ?: continue
                if (!target.isAfter(reference)) continue
                val reason = if (rule.captureGroup > 0 && matcher.groupCount() >= rule.captureGroup) {
                    rule.reason.replace("{n}", matcher.group(rule.captureGroup).orEmpty())
                } else {
                    rule.reason
                }
                emit(
                    matcher.group(),
                    matcher.start(),
                    target,
                    reason,
                    rule.priority,
                    rule.confidence,
                )
            }
        }
    }

    private fun resolveTarget(
        rule: Rule,
        matcher: java.util.regex.Matcher,
        reference: Instant,
        zonedNow: java.time.ZonedDateTime,
        defaults: Pair<Int, Int>,
    ): Instant? {
        val zone = zonedNow.zone
        return when (rule.resolve) {
            ResolveKind.PLUS_MINUTES -> {
                val n = parseCount(matcher.group(rule.captureGroup) ?: return null) ?: return null
                if (n !in rule.min..rule.max) return null
                reference.plusSeconds(n.toLong() * 60)
            }
            ResolveKind.PLUS_SECONDS -> reference.plusSeconds(rule.seconds)
            ResolveKind.PLUS_HOURS -> {
                val n = parseCount(matcher.group(rule.captureGroup) ?: return null) ?: return null
                if (n !in rule.min..rule.max) return null
                reference.plusSeconds(n.toLong() * 3600)
            }
            ResolveKind.EVENING_TODAY -> {
                val evening = zonedNow.toLocalDate().atTime(20, 0).atZone(zone)
                if (evening.toInstant().isAfter(reference)) evening.toInstant()
                else reference.plusSeconds(3600)
            }
            ResolveKind.TOMORROW_DEFAULT -> zonedNow.toLocalDate().plusDays(1)
                .atTime(defaults.first.coerceIn(0, 23), defaults.second.coerceIn(0, 59))
                .atZone(zone)
                .toInstant()
            ResolveKind.PLUS_DAYS_DEFAULT -> zonedNow.toLocalDate().plusDays(rule.days.toLong())
                .atTime(defaults.first.coerceIn(0, 23), defaults.second.coerceIn(0, 59))
                .atZone(zone)
                .toInstant()
        }
    }

    private fun parseCount(token: String): Int? =
        token.toIntOrNull() ?: numberWords[token.lowercase(Locale.US)]

    private fun pattern(source: String): Pattern =
        Pattern.compile(source, Pattern.CASE_INSENSITIVE)
}
