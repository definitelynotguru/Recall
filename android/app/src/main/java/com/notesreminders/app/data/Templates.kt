package com.notesreminders.app.data

import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

data class DefaultTemplate(val title: String, val body: String)

object Templates {
    private val DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    private val TIME_FMT = DateTimeFormatter.ofPattern("HH:mm")

    fun expandTemplate(text: String, title: String = ""): String {
        val date = LocalDate.now().format(DATE_FMT)
        val time = LocalTime.now().format(TIME_FMT)
        return text
            .replace(Regex("\\{\\{\\s*date\\s*\\}\\}", RegexOption.IGNORE_CASE), date)
            .replace(Regex("\\{\\{\\s*time\\s*\\}\\}", RegexOption.IGNORE_CASE), time)
            .replace(Regex("\\{\\{\\s*title\\s*\\}\\}", RegexOption.IGNORE_CASE), title)
    }

    val DEFAULTS = listOf(
        DefaultTemplate(
            "Daily Journal",
            "# {{date}}\n\n**Mood:** \n\n## What I did today\n- \n\n## Tomorrow\n- \n\n",
        ),
        DefaultTemplate(
            "Meeting Notes",
            "# {{title}} — {{date}}\n\n**Attendees:** \n\n## Agenda\n- \n\n## Notes\n- \n\n## Action items\n- [ ] \n\n",
        ),
        DefaultTemplate(
            "Project Brief",
            "# {{title}}\n\n## Goal\nWhat does success look like?\n\n## Scope\n- In: \n- Out: \n\n## Milestones\n- [ ] \n\n## Notes\n- \n\n",
        ),
    )
}
