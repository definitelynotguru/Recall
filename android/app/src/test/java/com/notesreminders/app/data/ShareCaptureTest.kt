package com.notesreminders.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ShareCaptureTest {

    @Test
    fun format_plainTextUsesFirstLineAsTitle() {
        val out = ShareCapture.format("Meeting notes\nFollow up with Sam")
        assertEquals("Meeting notes", out.title)
        assertEquals("Meeting notes\nFollow up with Sam", out.body)
        assertTrue(out.tags.contains("shared"))
    }

    @Test
    fun format_urlWithSourceTitleBecomesMarkdownLink() {
        val out = ShareCapture.format("https://example.com/page", "Cool Article")
        assertEquals("Cool Article", out.title)
        assertEquals("[Cool Article](https://example.com/page)", out.body)
        assertTrue(out.tags.contains("example.com"))
    }

    @Test
    fun format_urlWithoutTitleKeepsRawUrl() {
        val out = ShareCapture.format("https://example.com/page")
        assertEquals("https://example.com/page", out.title)
        assertEquals("https://example.com/page", out.body)
        assertTrue(out.tags.contains("example.com"))
    }

    @Test
    fun format_urlWithTitleAndExtraTextAppendsRest() {
        val out = ShareCapture.format("Read this https://example.com/x later", "Title")
        assertEquals("Title", out.title)
        assertTrue(out.body.contains("[Title](https://example.com/x)"))
        assertTrue(out.body.contains("Read this"))
    }

    @Test
    fun format_stripsTrailingPunctuationFromUrl() {
        val out = ShareCapture.format("https://example.com/page.", "T")
        assertTrue(out.body.contains("(https://example.com/page)"))
    }
}
