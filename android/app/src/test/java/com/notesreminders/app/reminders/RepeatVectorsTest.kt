package com.notesreminders.app.reminders

import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.annotations.SerializedName
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

class RepeatVectorsTest {
    private val gson = Gson()

    @Test
    fun sharedRepeatVectorsMatchWeb() {
        val vectors = gson.fromJson(
            locateSharedJson("repeat-vectors.json").readText(),
            JsonArray::class.java,
        )
        for (element in vectors) {
            val vector = gson.fromJson(element, RepeatVector::class.java)
            val next = RepeatUtils.computeNextOccurrence(
                repeatRule = vector.rule,
                fireAtIso = vector.fireAt,
                timezone = vector.timezone,
            )
            assertEquals(
                vector.rule,
                java.time.Instant.parse(vector.nextFireAt),
                java.time.Instant.parse(next),
            )
        }
    }

    private data class RepeatVector(
        val rule: String,
        @SerializedName("fire_at") val fireAt: String,
        val timezone: String,
        @SerializedName("next_fire_at") val nextFireAt: String,
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
