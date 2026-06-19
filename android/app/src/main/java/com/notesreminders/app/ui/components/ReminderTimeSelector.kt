package com.notesreminders.app.ui.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.theme.RecallColors
import com.notesreminders.app.ui.theme.recallTimeFilterChipColors
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun ReminderTimeSelector(
    hour24: Int,
    minute: Int,
    use12Hour: Boolean,
    onTimeChange: (hour24: Int, minute: Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val safeHour = hour24.coerceIn(0, 23)
    val safeMinute = minute.coerceIn(0, 59)
    val display12 = to12Hour(safeHour)
    val isPm = safeHour >= 12

    Column(modifier) {
        Text(
            formatPreview(safeHour, safeMinute, use12Hour),
            style = MaterialTheme.typography.titleMedium,
            color = RecallColors.Copper,
            modifier = Modifier.padding(bottom = 8.dp),
        )
        Text(
            "Hour",
            style = MaterialTheme.typography.labelSmall,
            color = RecallColors.ParchmentMuted,
        )
        Row(
            Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (use12Hour) {
                (1..12).forEach { h12 ->
                    TimeChip(
                        label = h12.toString(),
                        selected = display12 == h12,
                        onClick = {
                            onTimeChange(from12Hour(h12, isPm), safeMinute)
                        },
                    )
                }
            } else {
                (0..23).forEach { h ->
                    TimeChip(
                        label = h.toString().padStart(2, '0'),
                        selected = safeHour == h,
                        onClick = { onTimeChange(h, safeMinute) },
                    )
                }
            }
        }
        Text(
            "Minute",
            style = MaterialTheme.typography.labelSmall,
            color = RecallColors.ParchmentMuted,
            modifier = Modifier.padding(top = 4.dp),
        )
        Row(
            Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            (0..59).forEach { m ->
                TimeChip(
                    label = m.toString().padStart(2, '0'),
                    selected = safeMinute == m,
                    onClick = { onTimeChange(safeHour, m) },
                )
            }
        }
        if (use12Hour) {
            Row(
                Modifier.padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                TimeChip(
                    label = "AM",
                    selected = !isPm,
                    onClick = { onTimeChange(from12Hour(display12, false), safeMinute) },
                )
                TimeChip(
                    label = "PM",
                    selected = isPm,
                    onClick = { onTimeChange(from12Hour(display12, true), safeMinute) },
                )
            }
        }
    }
}

@Composable
private fun TimeChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        shape = RoundedCornerShape(10.dp),
        colors = recallTimeFilterChipColors(),
    )
}

private fun to12Hour(hour24: Int): Int {
    val h = hour24 % 12
    return if (h == 0) 12 else h
}

private fun from12Hour(hour12: Int, pm: Boolean): Int {
    val h = hour12 % 12
    return if (pm) h + 12 else h
}

private fun formatPreview(hour24: Int, minute: Int, use12Hour: Boolean): String {
    val pattern = if (use12Hour) "h:mm a" else "HH:mm"
    val formatter = DateTimeFormatter.ofPattern(pattern, Locale.getDefault())
    return java.time.LocalTime.of(hour24, minute).format(formatter)
}

fun parseReminderTimeFields(isoFireAt: String): Triple<String, Int, Int> {
    val zoned = java.time.Instant.parse(isoFireAt).atZone(java.time.ZoneId.systemDefault())
    val date = zoned.format(DateTimeFormatter.ISO_LOCAL_DATE)
    return Triple(date, zoned.hour, zoned.minute)
}
