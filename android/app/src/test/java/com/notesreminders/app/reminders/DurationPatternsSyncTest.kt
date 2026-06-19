package com.notesreminders.app.reminders

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

/** Ensures Kotlin duration rules stay aligned with shared/duration-patterns.json */
class DurationPatternsSyncTest {
    @Test
    fun rulesMatchSharedJson() {
        val json = locateSharedJson("duration-patterns.json")
        val root = JsonParser.parseString(json.readText()).asJsonObject
        val rules = root.getAsJsonArray("rules")
        assertEquals(8, rules.size())

        val kotlinResolve = mapOf(
            "plusMinutes" to "PLUS_MINUTES",
            "plusSeconds" to "PLUS_SECONDS",
            "plusHours" to "PLUS_HOURS",
            "eveningToday" to "EVENING_TODAY",
            "tomorrowDefault" to "TOMORROW_DEFAULT",
            "plusDaysDefault" to "PLUS_DAYS_DEFAULT",
        )

        val kotlinRules = listOf(
            RuleSpec("minutes", """\b(?:remind\s+me\s+)?(?:in|after)\s+(?:about|around|roughly)?\s*(\d{1,3}|[a-z]+)\s*(?:minute|min|mins|minutes)\b""", "PLUS_MINUTES", 1, 1, 999, 0, 0, 18, "HIGH", "Duration: in {n} minute(s)"),
            RuleSpec("halfHour", """\bin\s+(?:about\s+)?half\s+(?:an?\s+)?hour\b""", "PLUS_SECONDS", 0, 1, Int.MAX_VALUE, 1800, 0, 17, "HIGH", "Duration: half an hour"),
            RuleSpec("oneHour", """\b(?:in|after)\s+(?:an?\s+)?hour\b""", "PLUS_SECONDS", 0, 1, Int.MAX_VALUE, 3600, 0, 17, "HIGH", "Duration: in one hour"),
            RuleSpec("hours", """\b(?:in|after)\s+(?:about|around)?\s*(\d{1,2}|[a-z]+)\s+hours?\b""", "PLUS_HOURS", 1, 1, 48, 0, 0, 17, "HIGH", "Duration: in {n} hour(s)"),
            RuleSpec("laterToday", """\blater\s+today\b""", "PLUS_SECONDS", 0, 1, Int.MAX_VALUE, 10800, 0, 10, "MAYBE", "Vague: later today"),
            RuleSpec("tonight", """\btonight\b""", "EVENING_TODAY", 0, 1, Int.MAX_VALUE, 0, 0, 10, "MAYBE", "Vague: tonight"),
            RuleSpec("tomorrowMorning", """\btomorrow\s+morning\b""", "TOMORROW_DEFAULT", 0, 1, Int.MAX_VALUE, 0, 0, 12, "HIGH", "Relative: tomorrow morning"),
            RuleSpec("nextWeek", """\bnext\s+week\b""", "PLUS_DAYS_DEFAULT", 0, 1, Int.MAX_VALUE, 0, 7, 9, "MAYBE", "Relative: next week"),
        )

        for (i in 0 until rules.size()) {
            val jsonRule = rules[i].asJsonObject
            val kotlinRule = kotlinRules[i]
            assertEquals(kotlinRule.id, jsonRule.get("id").asString)
            assertEquals(kotlinRule.regex, jsonRule.get("regex").asString)
            assertEquals(kotlinRule.resolve, kotlinResolve[jsonRule.get("resolve").asString])
            assertEquals(kotlinRule.priority, jsonRule.get("priority").asInt)
            assertEquals(kotlinRule.confidence, jsonRule.get("confidence").asString.uppercase())
            assertEquals(kotlinRule.reason, jsonRule.get("reason").asString)
            if (jsonRule.has("captureGroup")) {
                assertEquals(kotlinRule.captureGroup, jsonRule.get("captureGroup").asInt)
            }
            if (jsonRule.has("min")) {
                assertEquals(kotlinRule.min, jsonRule.get("min").asInt)
            }
            if (jsonRule.has("max")) {
                assertEquals(kotlinRule.max, jsonRule.get("max").asInt)
            }
            if (jsonRule.has("seconds")) {
                assertEquals(kotlinRule.seconds, jsonRule.get("seconds").asLong)
            }
            if (jsonRule.has("days")) {
                assertEquals(kotlinRule.days, jsonRule.get("days").asInt)
            }
        }

        val numberWords = root.getAsJsonObject("numberWords")
        assertEquals(14, numberWords.size())
    }

    private data class RuleSpec(
        val id: String,
        val regex: String,
        val resolve: String,
        val captureGroup: Int,
        val min: Int,
        val max: Int,
        val seconds: Long,
        val days: Int,
        val priority: Int,
        val confidence: String,
        val reason: String,
    )

    private fun locateSharedJson(name: String): File {
        var dir: File? = File(System.getProperty("user.dir"))
        while (dir != null) {
            val candidate = File(dir, "shared/$name")
            if (candidate.isFile) return candidate
            dir = dir.parentFile
        }
        error("Missing shared/$name (cwd=${System.getProperty("user.dir")})")
    }
}
