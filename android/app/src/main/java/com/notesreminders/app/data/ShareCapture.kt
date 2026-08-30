package com.notesreminders.app.data

import java.net.URI

data class SharedNoteContent(
    val title: String,
    val body: String,
    val tags: List<String>,
)

object ShareCapture {
    private val URL_REGEX = Regex("""https?://[^\s]+""")

    fun format(
        text: String,
        sourceTitle: String? = null,
    ): SharedNoteContent {
        val clean = text.trim()
        val firstUrl = URL_REGEX.find(clean)?.value?.trimEnd('.', ',', ')', ']', '!')
        val body =
            if (firstUrl != null && !sourceTitle.isNullOrBlank()) {
                val link = "[$sourceTitle]($firstUrl)"
                val rest = clean.replace(firstUrl, "").trim().trim('\n')
                if (rest.isBlank()) link else "$link\n\n$rest"
            } else {
                clean
            }
        val title =
            sourceTitle?.takeIf { it.isNotBlank() }
                ?: clean
                    .lineSequence()
                    .firstOrNull { it.isNotBlank() }
                    ?.trim()
                    ?.take(80)
                    .orEmpty()
        val tags =
            buildList {
                add("shared")
                firstUrl?.let { hostOf(it) }?.let { add(it) }
            }
        return SharedNoteContent(title.ifBlank { "Shared note" }, body, tags)
    }

    fun hostOf(url: String): String? = try {
        URI(url).host?.removePrefix("www.")
    } catch (_: Exception) {
        null
    }
}
