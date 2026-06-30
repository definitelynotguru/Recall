package com.notesreminders.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.ui.theme.RecallColors
import com.notesreminders.app.ui.theme.recallPrimaryButtonColors
import com.notesreminders.app.ui.theme.recallSecondaryButtonColors

@Composable
fun NoteReminderSection(
    reminders: List<ReminderEntity>,
    fetchingReminders: Boolean,
    onAddReminder: () -> Unit,
    onFetchReminders: () -> Unit,
    onEditReminder: (ReminderEntity) -> Unit,
    onDeleteReminder: (ReminderEntity) -> Unit,
) {
    Text(
        "Reminders",
        style = MaterialTheme.typography.headlineMedium,
        color = RecallColors.Parchment,
    )
    Spacer(Modifier.height(8.dp))
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(RecallColors.CopperDim)
            .padding(14.dp),
    ) {
        Icon(Icons.Default.Notifications, null, tint = RecallColors.Copper)
        Spacer(Modifier.width(12.dp))
        Text(
            "Reminders notify on this device. Sync uploads changes to the web.",
            style = MaterialTheme.typography.bodySmall,
            color = RecallColors.ParchmentMuted,
        )
    }
    Spacer(Modifier.height(16.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Button(
            onClick = onAddReminder,
            colors = recallPrimaryButtonColors(),
        ) {
            Text("Add reminder")
        }
        Button(
            onClick = onFetchReminders,
            enabled = !fetchingReminders,
            colors = recallSecondaryButtonColors(),
        ) {
            Text(if (fetchingReminders) "Scanning\u2026" else "Fetch reminders")
        }
    }

    reminders.filter { it.status == "active" }.forEach { r ->
        Spacer(Modifier.height(10.dp))
        RecallPanel {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        formatReminderFireAt(r.fireAt),
                        style = MaterialTheme.typography.titleMedium,
                        color = RecallColors.Parchment,
                    )
                    r.repeatRule?.let {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            it.uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = RecallColors.Copper,
                        )
                    }
                }
                Row {
                    IconButton(onClick = { onEditReminder(r) }) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Edit",
                            tint = RecallColors.Copper,
                        )
                    }
                    IconButton(onClick = { onDeleteReminder(r) }) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Delete",
                            tint = RecallColors.ParchmentMuted,
                        )
                    }
                }
            }
        }
    }
}
