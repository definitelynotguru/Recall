package com.notesreminders.app.data

import com.google.gson.GsonBuilder
import com.notesreminders.app.data.api.NoteDto
import com.notesreminders.app.data.api.NoteTagDto
import com.notesreminders.app.data.api.ReminderDto
import com.notesreminders.app.data.api.TagDto
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

data class MarkdownNote(
    val id: String,
    val title: String,
    val file: String,
    val status: String,
    val pinned_at: String?,
    val created_at: String,
    val updated_at: String,
    val deleted_at: String?,
    val tags: List<String>,
)

data class MarkdownReminder(
    val id: String,
    val note_id: String,
    val note_file: String,
    val fire_at: String,
    val timezone: String,
    val repeat_rule: String?,
    val intensity: String,
    val reminder_mode: String,
    val nag_interval_minutes: Int?,
    val status: String,
    val completed_at: String?,
    val created_at: String,
    val updated_at: String,
    val deleted_at: String?,
)

data class MarkdownTag(val id: String, val name: String)

data class MarkdownNoteTag(val id: String, val note_id: String, val tag_id: String)

data class MarkdownMeta(
    val app: String,
    val exported_at: String,
    val notes: List<MarkdownNote>,
    val reminders: List<MarkdownReminder>,
    val tags: List<MarkdownTag>,
    val note_tags: List<MarkdownNoteTag>,
)

object MarkdownExport {
    private const val MAX_FILENAME = 100
    private val illegalChars = Regex("[\\\\/:*?\"<>|\\x00-\\x1f]")

    fun sanitizeFilename(title: String, id: String): String {
        val base = title.trim()
        val candidate = if (base.isNotEmpty()) base else id
        var cleaned = illegalChars.replace(candidate, "_")
        cleaned = cleaned.replace(Regex("\\s+"), " ")
        cleaned = cleaned.replace(Regex("_+"), "_")
        cleaned = cleaned.trimEnd('.', ' ')
        if (cleaned.isEmpty()) return id
        if (cleaned.length <= MAX_FILENAME) return cleaned
        val slice = cleaned.take(MAX_FILENAME)
        val lastSpace = slice.lastIndexOf(' ')
        val out = if (lastSpace > 0) slice.take(lastSpace) else slice
        return out.trim().ifEmpty { id }
    }

    fun uniqueFilename(base: String, used: MutableSet<String>): String {
        if (used.add(base)) return base
        var n = 2
        while (!used.add("$base-$n")) n += 1
        return "$base-$n"
    }

    fun buildZip(bundle: BackupBundle): ByteArray {
        val nameById = mutableMapOf<String, String>()
        for (tag in bundle.tags.orEmpty()) {
            if (!tag.id.isNullOrEmpty() && tag.deleted_at == null) {
                nameById[tag.id] = tag.name
            }
        }
        val tagsByNote = mutableMapOf<String, MutableList<String>>()
        for (link in bundle.note_tags.orEmpty()) {
            if (link.deleted_at != null) continue
            val name = link.tag_id?.let { nameById[it] } ?: continue
            val list = tagsByNote.getOrPut(link.note_id) { mutableListOf() }
            list.add(name)
        }

        val used = mutableSetOf<String>()
        val fileByNoteId = mutableMapOf<String, String>()
        val notesMeta = mutableListOf<MarkdownNote>()

        val baos = ByteArrayOutputStream()
        ZipOutputStream(baos).use { zip ->
            for (note in bundle.notes.orEmpty()) {
                if (note.id.isNullOrEmpty() || note.deleted_at != null) continue
                val stem = uniqueFilename(sanitizeFilename(note.title, note.id), used)
                val file = "notes/$stem.md"
                fileByNoteId[note.id] = file
                zip.putNextEntry(ZipEntry(file))
                zip.write((note.body ?: "").toByteArray(Charsets.UTF_8))
                zip.closeEntry()
                notesMeta.add(
                    MarkdownNote(
                        id = note.id,
                        title = note.title ?: "",
                        file = file,
                        status = note.status ?: "active",
                        pinned_at = note.pinned_at,
                        created_at = note.created_at,
                        updated_at = note.updated_at,
                        deleted_at = note.deleted_at,
                        tags = tagsByNote[note.id] ?: emptyList(),
                    ),
                )
            }

            val remindersMeta = mutableListOf<MarkdownReminder>()
            for ((noteId, list) in bundle.reminders_by_note.orEmpty()) {
                val noteFile = fileByNoteId[noteId] ?: ""
                for (r in list) {
                    if (r.id.isNullOrEmpty() || r.deleted_at != null) continue
                    remindersMeta.add(
                        MarkdownReminder(
                            id = r.id,
                            note_id = noteId,
                            note_file = noteFile,
                            fire_at = r.fire_at,
                            timezone = r.timezone,
                            repeat_rule = r.repeat_rule,
                            intensity = r.intensity,
                            reminder_mode = r.reminder_mode,
                            nag_interval_minutes = r.nag_interval_minutes,
                            status = r.status,
                            completed_at = r.completed_at,
                            created_at = r.created_at,
                            updated_at = r.updated_at,
                            deleted_at = r.deleted_at,
                        ),
                    )
                }
            }

            val tagsMeta = bundle.tags.orEmpty()
                .filter { !it.id.isNullOrEmpty() && it.deleted_at == null }
                .map { MarkdownTag(it.id, it.name) }
            val noteTagsMeta = bundle.note_tags.orEmpty()
                .filter { !it.id.isNullOrEmpty() && it.deleted_at == null }
                .map { MarkdownNoteTag(it.id, it.note_id, it.tag_id) }

            val meta = MarkdownMeta(
                app = "recall",
                exported_at = bundle.exported_at,
                notes = notesMeta,
                reminders = remindersMeta,
                tags = tagsMeta,
                note_tags = noteTagsMeta,
            )
            val gson = GsonBuilder().setPrettyPrinting().create()
            zip.putNextEntry(ZipEntry("metadata.json"))
            zip.write(gson.toJson(meta).toByteArray(Charsets.UTF_8))
            zip.closeEntry()
        }
        return baos.toByteArray()
    }
}
