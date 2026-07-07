package com.notesreminders.app.data

import com.google.gson.JsonParser
import com.notesreminders.app.data.api.NoteDto
import com.notesreminders.app.data.api.NoteTagDto
import com.notesreminders.app.data.api.ReminderDto
import com.notesreminders.app.data.api.TagDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.util.zip.ZipInputStream

class MarkdownExportTest {

    @Test
    fun sanitizeFilename_fallsBackToIdWhenBlank() {
        assertEquals("abc-123", MarkdownExport.sanitizeFilename("", "abc-123"))
        assertEquals("abc-123", MarkdownExport.sanitizeFilename("   ", "abc-123"))
    }

    @Test
    fun sanitizeFilename_replacesIllegalChars() {
        assertEquals("a_b_c_d_e_f_g_h", MarkdownExport.sanitizeFilename("a/b:c?d*e<f>g|h", "id"))
    }

    @Test
    fun sanitizeFilename_trimsTrailingDotsAndSpaces() {
        assertEquals("note", MarkdownExport.sanitizeFilename("note.  ", "id"))
    }

    @Test
    fun uniqueFilename_appendsCounterOnCollision() {
        val used = mutableSetOf("daily")
        assertEquals("daily-2", MarkdownExport.uniqueFilename("daily", used))
        assertEquals("daily-3", MarkdownExport.uniqueFilename("daily", used))
    }

    @Test
    fun buildZip_packsMarkdownFilesAndMetadata() {
        val bundle = BackupBundle(
            exported_at = "2026-07-07T12:00:00.000Z",
            notes = listOf(
                NoteDto(id = "n1", title = "First Note", body = "# Hello\n\nWorld", status = "active", pinned_at = "2026-07-01T00:00:00.000Z", created_at = "2026-07-01T00:00:00.000Z", updated_at = "2026-07-02T00:00:00.000Z", deleted_at = null),
                NoteDto(id = "n2", title = "First Note", body = "second body", status = "active", pinned_at = null, created_at = "2026-07-03T00:00:00.000Z", updated_at = "2026-07-03T00:00:00.000Z", deleted_at = null),
                NoteDto(id = "n3", title = "Gone", body = "deleted", status = "active", pinned_at = null, created_at = "2026-07-03T00:00:00.000Z", updated_at = "2026-07-03T00:00:00.000Z", deleted_at = "2026-07-04T00:00:00.000Z"),
            ),
            reminders_by_note = mapOf(
                "n1" to listOf(
                    ReminderDto(id = "r1", note_id = "n1", fire_at = "2026-07-10T09:00:00.000Z", timezone = "UTC", repeat_rule = null, intensity = "gentle", reminder_mode = "once", nag_interval_minutes = null, status = "active", completed_at = null, created_at = "2026-07-01T00:00:00.000Z", updated_at = "2026-07-01T00:00:00.000Z", deleted_at = null),
                ),
            ),
            tags = listOf(TagDto(id = "t1", name = "journal", created_at = "2026-07-01T00:00:00.000Z", updated_at = "2026-07-01T00:00:00.000Z", deleted_at = null)),
            note_tags = listOf(NoteTagDto(id = "lt1", note_id = "n1", tag_id = "t1", created_at = "2026-07-01T00:00:00.000Z", updated_at = "2026-07-01T00:00:00.000Z", deleted_at = null)),
        )

        val bytes = MarkdownExport.buildZip(bundle)
        val entries = mutableMapOf<String, String>()
        ZipInputStream(ByteArrayInputStream(bytes)).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                entries[entry.name] = zip.readBytes().toString(Charsets.UTF_8)
                entry = zip.nextEntry
            }
        }

        assertTrue(entries.containsKey("notes/First Note.md"))
        assertTrue(entries.containsKey("notes/First Note-2.md"))
        assertEquals("# Hello\n\nWorld", entries["notes/First Note.md"])
        assertEquals("second body", entries["notes/First Note-2.md"])
        assertTrue(!entries.containsKey("notes/Gone.md"))

        val meta = JsonParser.parseString(entries["metadata.json"]).asJsonObject
        assertEquals("recall", meta.get("app").asString)
        assertEquals(2, meta.getAsJsonArray("notes").size())
        val note0 = meta.getAsJsonArray("notes")[0].asJsonObject
        assertEquals("notes/First Note.md", note0.get("file").asString)
        assertEquals("journal", note0.getAsJsonArray("tags")[0].asString)
        assertEquals("2026-07-01T00:00:00.000Z", note0.get("pinned_at").asString)
        assertEquals(1, meta.getAsJsonArray("reminders").size())
        assertEquals("notes/First Note.md", meta.getAsJsonArray("reminders")[0].asJsonObject.get("note_file").asString)
        assertEquals(1, meta.getAsJsonArray("tags").size())
        assertEquals(1, meta.getAsJsonArray("note_tags").size())
    }
}
