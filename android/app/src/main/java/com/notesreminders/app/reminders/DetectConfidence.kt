package com.notesreminders.app.reminders

enum class DetectConfidence(val wire: String) {
    HIGH("high"),
    MAYBE("maybe"),
    ;

    companion object {
        fun fromWire(value: String): DetectConfidence =
            entries.find { it.wire == value } ?: HIGH
    }
}
