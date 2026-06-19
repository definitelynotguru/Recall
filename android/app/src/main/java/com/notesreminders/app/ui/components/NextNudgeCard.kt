package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.reminders.RepeatUtils
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun NextNudgeCard(
    reminder: ReminderEntity?,
    noteTitle: String?,
    modifier: Modifier = Modifier,
) {
    if (reminder == null) return
    RecallPanel(modifier = modifier.fillMaxWidth()) {
        Text(
            "Next nudge",
            style = MaterialTheme.typography.labelSmall,
            color = RecallColors.ParchmentMuted,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            noteTitle?.ifBlank { "Untitled" } ?: "Note",
            style = MaterialTheme.typography.titleMedium,
            color = RecallColors.Parchment,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            formatReminderFireAt(reminder.fireAt),
            style = MaterialTheme.typography.bodySmall,
            color = RecallColors.ParchmentMuted,
        )
        reminder.repeatRule?.let { rule ->
            Spacer(Modifier.height(6.dp))
            Text(
                RepeatUtils.formatRepeatLabel(rule),
                style = MaterialTheme.typography.labelSmall,
                color = RecallColors.Copper,
                modifier = Modifier.padding(horizontal = 2.dp),
            )
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Delivered on your phone after sync",
            style = MaterialTheme.typography.labelSmall,
            color = RecallColors.ParchmentMuted,
        )
    }
}

fun pickNextReminder(reminders: List<ReminderEntity>): ReminderEntity? {
    val now = java.time.Instant.now()
    return reminders
        .filter { it.status == "active" && it.deletedAt == null }
        .sortedBy { it.fireAt }
        .firstOrNull { java.time.Instant.parse(it.fireAt) >= now }
        ?: reminders
            .filter { it.status == "active" && it.deletedAt == null }
            .minByOrNull { it.fireAt }
}
