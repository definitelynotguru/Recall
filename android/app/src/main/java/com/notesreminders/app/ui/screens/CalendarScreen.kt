package com.notesreminders.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.components.RecallScreenHeader
import com.notesreminders.app.ui.theme.RecallColors
import java.time.LocalDate
import java.time.YearMonth

private val WEEKDAYS = listOf("S", "M", "T", "W", "T", "F", "S")
private val MONTHS = listOf(
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)

@Composable
fun CalendarScreen(
    viewModel: AppViewModel,
    onOpenNote: (String) -> Unit,
    onLogout: () -> Unit,
) {
    val syncing by viewModel.isSyncing.collectAsStateWithLifecycle()
    val syncHint by viewModel.syncHint.collectAsStateWithLifecycle()
    val hasPendingSync by viewModel.hasPendingSync.collectAsStateWithLifecycle()
    val dailyNotes by viewModel.observeDailyNotes().collectAsStateWithLifecycle(initialValue = emptyList())

    val today = remember { LocalDate.now() }
    var year by remember { mutableStateOf(today.year) }
    var month by remember { mutableStateOf(today.monthValue - 1) }

    val dailyDates = remember(dailyNotes) {
        dailyNotes.mapNotNull { it.dailyDate }.toSet()
    }

    val monthObj = remember(year, month) { YearMonth.of(year, month + 1) }
    val firstWeekday = monthObj.atDay(1).dayOfWeek.value % 7
    val daysInMonth = monthObj.lengthOfMonth()

    val cells = remember(firstWeekday, daysInMonth) {
        buildList {
            repeat(firstWeekday) { add(null) }
            for (d in 1..daysInMonth) add(d)
        }
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(16.dp))
        RecallScreenHeader(
            title = "Calendar",
            subtitle = "Tap a day to open or create a daily note",
            isSyncing = syncing,
            syncHint = syncHint,
            hasPendingSync = hasPendingSync,
            onSync = { viewModel.syncNow() },
            onSignOut = onLogout,
        )
        Spacer(Modifier.height(16.dp))

        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = {
                if (month == 0) { month = 11; year-- } else month--
            }) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Previous month", tint = RecallColors.Parchment)
            }
            Text(
                "${MONTHS[month]} $year",
                color = RecallColors.Parchment,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { viewModel.openToday(onOpenNote) }) {
                    Text("Today", color = RecallColors.Copper)
                }
                IconButton(onClick = {
                    if (month == 11) { month = 0; year++ } else month++
                }) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Next month", tint = RecallColors.Parchment)
                }
            }
        }
        Spacer(Modifier.height(8.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            WEEKDAYS.forEach { d ->
                Text(
                    d,
                    color = RecallColors.ParchmentMuted,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.weight(1f),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }
        Spacer(Modifier.height(4.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(7),
            modifier = Modifier.fillMaxWidth(),
        ) {
            items(cells) { day ->
                if (day == null) {
                    Box(Modifier.aspectRatio(1f))
                } else {
                    val date = "%04d-%02d-%02d".format(year, month + 1, day)
                    val hasNote = date in dailyDates
                    val isToday = date == today.toString()
                    DayCell(
                        day = day,
                        hasNote = hasNote,
                        isToday = isToday,
                        onClick = { viewModel.openDailyNote(date, onOpenNote) },
                    )
                }
            }
        }
    }
}

@Composable
private fun DayCell(
    day: Int,
    hasNote: Boolean,
    isToday: Boolean,
    onClick: () -> Unit,
) {
    Box(
        Modifier
            .aspectRatio(1f)
            .clip(CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "$day",
                color = if (isToday) RecallColors.Copper else RecallColors.Parchment,
                fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal,
            )
            if (hasNote) {
                Spacer(Modifier.height(2.dp))
                Box(
                    Modifier
                        .size(5.dp)
                        .clip(CircleShape)
                        .background(RecallColors.Copper),
                )
            }
        }
    }
}
