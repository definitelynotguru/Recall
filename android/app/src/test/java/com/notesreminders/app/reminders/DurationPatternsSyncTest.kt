package com.notesreminders.app.reminders

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

/** Ensures Kotlin rules stay aligned with shared/duration-patterns.json */
class DurationPatternsSyncTest {
    @Test
    fun ruleCountMatchesSharedJson() {
        val jsonFile = File("shared/duration-patterns.json")
        if (!jsonFile.exists()) {
            // CI runs from android/ subdir
            val alt = File("../shared/duration-patterns.json")
            require(alt.exists()) { "Missing shared/duration-patterns.json" }
            assertEquals(8, JSONObject(alt.readText()).getJSONArray("rules").length())
        } else {
            assertEquals(8, JSONObject(jsonFile.readText()).getJSONArray("rules").length())
        }
    }
}
