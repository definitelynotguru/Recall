package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.reminders.DetectedReminder
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun DetectedRemindersDialog(
    open: Boolean,
    detected: List<DetectedReminder>,
    selectedIds: Set<String>,
    onToggle: (String, Boolean) -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    if (!open) return

    RecallAlertDialog(
        onDismissRequest = onDismiss,
        title = "Detected reminders",
        text = {
            Column {
                if (detected.isEmpty()) {
                    Text(
                        "No dates found. Try phrases like \"in 3 minutes\", \"tomorrow at 9am\", or Day/Month/Year fields.",
                        color = RecallColors.ParchmentMuted,
                        style = MaterialTheme.typography.bodySmall,
                    )
                } else {
                    detected.forEach { d ->
                        DetectedReminderRow(
                            item = d,
                            checked = selectedIds.contains(d.id),
                            onCheckedChange = { onToggle(d.id, it) },
                        )
                    }
                }
            }
        },
        confirmButton = {
            if (detected.isNotEmpty()) {
                RecallDialogConfirmButton(
                    label = "Add selected",
                    onClick = onConfirm,
                    enabled = selectedIds.isNotEmpty(),
                )
            }
        },
        dismissButton = {
            RecallDialogTextButton("Cancel", onDismiss, RecallColors.ParchmentMuted)
        },
    )
}

@Composable
private fun DetectedReminderRow(
    item: DetectedReminder,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    val formatted = formatReminderFireAt(item.fireAt)
    val confidenceLabel = if (item.confidence == "high") "Likely" else "Maybe"

    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = CheckboxDefaults.colors(
                checkedColor = RecallColors.Copper,
                checkmarkColor = RecallColors.Ink,
            ),
        )
        Column(Modifier.weight(1f)) {
            Text(item.label, color = RecallColors.Parchment)
            Text(
                formatted,
                style = MaterialTheme.typography.labelSmall,
                color = RecallColors.ParchmentMuted,
            )
            Text(
                "$confidenceLabel · ${(item.repeatRule ?: "once").uppercase()}",
                style = MaterialTheme.typography.labelSmall,
                color = RecallColors.Copper,
            )
            Text(
                "“${item.source.take(80)}”",
                style = MaterialTheme.typography.bodySmall,
                color = RecallColors.ParchmentMuted,
            )
            Text(
                item.reason,
                style = MaterialTheme.typography.bodySmall,
                color = RecallColors.ParchmentMuted,
            )
        }
    }
}
