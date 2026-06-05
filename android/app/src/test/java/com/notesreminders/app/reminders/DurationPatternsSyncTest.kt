package com.notesreminders.app.reminders

import com.google.gson.JsonParser
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

/** Ensures Kotlin rules stay aligned with shared/duration-patterns.json */
class DurationPatternsSyncTest {
    @Test
    fun ruleCountMatchesSharedJson() {
        val json = locateSharedJson("duration-patterns.json")
        val rules = JsonParser.parseString(json.readText())
            .asJsonObject
            .getAsJsonArray("rules")
        assertEquals(8, rules.size())
    }

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
