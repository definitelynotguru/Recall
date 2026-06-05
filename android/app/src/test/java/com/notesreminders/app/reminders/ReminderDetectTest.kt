package com.notesreminders.app.reminders

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.Duration

class ReminderDetectTest {
    private val ref = Instant.parse("2026-06-05T12:00:00Z")

    @Test
    fun inThreeMinutes_wordForm() {
        val found = ReminderDetect.detect(
            "Task",
            "remind me in three minutes",
            referenceInstant = ref,
        )
        assertEquals(1, found.size)
        assertEquals("high", found[0].confidence)
        val fire = Instant.parse(found[0].fireAt)
        assertEquals(180, Duration.between(ref, fire).seconds)
    }

    @Test
    fun inAbout3Minutes_numeric() {
        val found = ReminderDetect.detect(
            "Task",
            "in about 3 minutes",
            referenceInstant = ref,
        )
        assertEquals(1, found.size)
        val fire = Instant.parse(found[0].fireAt)
        assertEquals(180, Duration.between(ref, fire).seconds)
    }

    @Test
    fun halfHour() {
        val found = ReminderDetect.detect(
            "",
            "ping in half an hour",
            referenceInstant = ref,
        )
        assertEquals(1, found.size)
        val fire = Instant.parse(found[0].fireAt)
        assertEquals(1800, Duration.between(ref, fire).seconds)
    }

    @Test
    fun tonight_isMaybe() {
        val found = ReminderDetect.detect(
            "",
            "review tonight",
            referenceInstant = ref,
        )
        assertEquals(1, found.size)
        assertEquals("maybe", found[0].confidence)
        assertTrue(Instant.parse(found[0].fireAt).isAfter(ref))
    }
}
