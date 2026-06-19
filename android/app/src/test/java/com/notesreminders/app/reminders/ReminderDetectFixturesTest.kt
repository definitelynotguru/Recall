package com.notesreminders.app.reminders

import com.google.gson.Gson
import com.google.gson.JsonArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.Instant

class ReminderDetectFixturesTest {
    private val gson = Gson()
    private val referenceInstant = Instant.parse("2026-05-01T12:00:00Z")

    @Test
    fun fixturesMatchExpectedCounts() {
        val fixturesFile = locateFixturesFile()
        val cases = gson.fromJson(fixturesFile.readText(), JsonArray::class.java)
        assertTrue("fixtures should contain cases", cases.size() > 0)

        for (element in cases) {
            val obj = element.asJsonObject
            val title = obj.get("title")?.asString ?: ""
            val body = obj.get("body")?.asString ?: ""
            val expectCount = obj.get("expectCount").asInt
            val results = ReminderDetect.detect(
                title,
                body,
                defaultHour = 9,
                defaultMinute = 0,
                referenceInstant = referenceInstant,
            )
            assertEquals(
                "fixture ${obj.get("id")?.asString ?: title}",
                expectCount.coerceAtMost(5),
                results.size,
            )
            if (expectCount > 0 && obj.has("expectRepeat")) {
                val expectRepeat = obj.get("expectRepeat")
                val expected = if (expectRepeat.isJsonNull) null else expectRepeat.asString
                assertEquals(expected, results.first().repeatRule)
            }
        }
    }

    private fun locateFixturesFile(): File {
        val candidates = listOf(
            File("shared/fixtures.json"),
            File("../shared/fixtures.json"),
            File("../../shared/fixtures.json"),
        )
        return candidates.firstOrNull { it.exists() }
            ?: error("shared/fixtures.json not found from ${File(".").absolutePath}")
    }
}
