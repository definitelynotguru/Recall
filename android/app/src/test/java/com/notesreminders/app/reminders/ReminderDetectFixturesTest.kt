package com.notesreminders.app.reminders

import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.annotations.SerializedName
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import java.time.Instant

class ReminderDetectFixturesTest {
    private val gson = Gson()
    private val referenceInstant = Instant.parse("2026-05-01T12:00:00Z")

    @Test
    fun sharedFixturesMatchWebExpectations() {
        val fixtures = gson.fromJson(
            locateSharedJson("fixtures.json").readText(),
            JsonArray::class.java,
        )
        for (element in fixtures) {
            val fixture = gson.fromJson(element, FixtureCase::class.java)
            val found = ReminderDetect.detect(
                title = fixture.title,
                body = fixture.body,
                defaultHour = 9,
                defaultMinute = 0,
                referenceInstant = referenceInstant,
            )
            assertEquals(
                "fixture '${fixture.title}' count",
                fixture.expectCount,
                found.size,
            )
            if (fixture.expectCount > 0) {
                assertEquals(
                    "fixture '${fixture.title}' repeat",
                    fixture.expectRepeat,
                    found[0].repeatRule,
                )
            }
            if (fixture.expectCount > 0 && fixture.expectConfidence != null) {
                assertEquals(
                    "fixture '${fixture.title}' confidence",
                    fixture.expectConfidence,
                    found[0].confidence,
                )
            }
        }
    }

    private data class FixtureCase(
        val title: String,
        val body: String,
        @SerializedName("expectCount") val expectCount: Int,
        @SerializedName("expectRepeat") val expectRepeat: String?,
        @SerializedName("expectConfidence") val expectConfidence: String?,
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
