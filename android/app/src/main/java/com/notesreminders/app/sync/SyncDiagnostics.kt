package com.notesreminders.app.sync

/** In-memory sync diagnostics for debug reports (no tokens). */
object SyncDiagnostics {
    @Volatile
    var lastWarnings: List<String> = emptyList()

    @Volatile
    var lastError: String? = null

    @Volatile
    var lastSanitizedNoteCount: Int = 0

    @Volatile
    var lastSanitizedReminderCount: Int = 0
}
