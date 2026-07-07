package com.notesreminders.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TemplatesTest {

    @Test
    fun expandTemplate_replacesDateAndTimeAndTitle() {
        val out = Templates.expandTemplate("# {{title}} at {{time}} on {{date}}", "Sprint")
        assertTrue(out.startsWith("# Sprint at "))
        assertTrue(out.contains(" on "))
    }

    @Test
    fun expandTemplate_isCaseInsensitiveAndToleratesWhitespace() {
        val out = Templates.expandTemplate("{{  DATE  }} {{Time}}")
        assertTrue(out.matches(Regex("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}")))
    }

    @Test
    fun expandTemplate_leavesUnknownBraces() {
        val out = Templates.expandTemplate("{{author}} {{date}}")
        assertTrue(out.contains("{{author}}"))
    }

    @Test
    fun defaults_shipThreeTemplatesWithVariables() {
        assertEquals(3, Templates.DEFAULTS.size)
        assertEquals(listOf("Daily Journal", "Meeting Notes", "Project Brief"), Templates.DEFAULTS.map { it.title })
        assertTrue(Templates.DEFAULTS.all { it.body.contains("{{") })
    }
}
