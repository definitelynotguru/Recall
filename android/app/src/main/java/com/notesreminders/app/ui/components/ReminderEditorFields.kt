package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.theme.RecallColors

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReminderEditorFields(
    reminderDate: String,
    onDateChange: (String) -> Unit,
    hour24: Int,
    minute: Int,
    onTimeChange: (hour24: Int, minute: Int) -> Unit,
    use12Hour: Boolean,
    repeatRule: String,
    onRepeatChange: (String) -> Unit,
    fieldColors: androidx.compose.material3.TextFieldColors,
    defaultHour: Int,
    defaultMinute: Int,
) {
    OutlinedTextField(
        value = reminderDate,
        onValueChange = onDateChange,
        label = { Text("Date (YYYY-MM-DD)") },
        colors = fieldColors,
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
    )
    Spacer(Modifier.height(12.dp))
    ReminderTimeSelector(
        hour24 = hour24,
        minute = minute,
        use12Hour = use12Hour,
        onTimeChange = onTimeChange,
    )
    Spacer(Modifier.height(8.dp))
    Text(
        "Quick pick",
        style = androidx.compose.material3.MaterialTheme.typography.labelSmall,
        color = RecallColors.ParchmentMuted,
    )
    Spacer(Modifier.height(6.dp))
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        QuickChip("+10 min") {
            applyReminderQuickPick(ReminderQuickPick.PLUS_10_MIN, defaultHour, defaultMinute, onDateChange, onTimeChange)
        }
        QuickChip("+1 hour") {
            applyReminderQuickPick(ReminderQuickPick.PLUS_1_HOUR, defaultHour, defaultMinute, onDateChange, onTimeChange)
        }
        QuickChip("Tonight") {
            applyReminderQuickPick(ReminderQuickPick.TONIGHT, defaultHour, defaultMinute, onDateChange, onTimeChange)
        }
        QuickChip("Tomorrow") {
            applyReminderQuickPick(ReminderQuickPick.TOMORROW, defaultHour, defaultMinute, onDateChange, onTimeChange)
        }
    }
    Spacer(Modifier.height(8.dp))
    OutlinedTextField(
        value = repeatRule,
        onValueChange = onRepeatChange,
        label = { Text("Repeat or empty") },
        colors = fieldColors,
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
    )
}

@Composable
private fun QuickChip(label: String, onClick: () -> Unit) {
    FilterChip(
        selected = false,
        onClick = onClick,
        label = { Text(label) },
        colors = FilterChipDefaults.filterChipColors(
            containerColor = RecallColors.InkElevated,
            labelColor = RecallColors.Copper,
        ),
    )
}
