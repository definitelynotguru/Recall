package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun ReminderScheduleDialog(
    open: Boolean,
    title: String,
    reminderDate: String,
    onDateChange: (String) -> Unit,
    hour24: Int,
    minute: Int,
    onTimeChange: (Int, Int) -> Unit,
    use12Hour: Boolean,
    repeatRule: String,
    onRepeatChange: (String) -> Unit,
    defaultHour: Int,
    defaultMinute: Int,
    showDelete: Boolean,
    onDelete: () -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
) {
    if (!open) return

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = RecallColors.Copper,
        unfocusedBorderColor = RecallColors.BorderStrong,
        focusedTextColor = RecallColors.Parchment,
        unfocusedTextColor = RecallColors.Parchment,
        focusedLabelColor = RecallColors.ParchmentMuted,
        unfocusedLabelColor = RecallColors.ParchmentMuted,
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = RecallColors.InkSurface,
        title = { Text(title, color = RecallColors.Parchment) },
        text = {
            Column {
                ReminderEditorFields(
                    reminderDate = reminderDate,
                    onDateChange = onDateChange,
                    hour24 = hour24,
                    minute = minute,
                    onTimeChange = onTimeChange,
                    use12Hour = use12Hour,
                    repeatRule = repeatRule,
                    onRepeatChange = onRepeatChange,
                    fieldColors = fieldColors,
                    defaultHour = defaultHour,
                    defaultMinute = defaultMinute,
                )
                if (showDelete) {
                    Spacer(Modifier.height(12.dp))
                    TextButton(onClick = onDelete) {
                        Text("Delete reminder", color = RecallColors.Error)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onSave) {
                Text("Save", color = RecallColors.Copper)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = RecallColors.ParchmentMuted)
            }
        },
    )
}
