package com.notesreminders.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.components.RecallPanel
import com.notesreminders.app.ui.components.RecallScreenHeader
import com.notesreminders.app.ui.theme.RecallColors
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun TodayScreen(
    viewModel: AppViewModel,
    onOpenNote: (String) -> Unit,
    onLogout: () -> Unit,
) {
    val notes by viewModel.notes.collectAsState()
    val reminders by viewModel.reminders.collectAsState()
    val syncing by viewModel.isSyncing.collectAsState()
    val syncHint by viewModel.syncHint.collectAsState()

    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(16.dp))
        RecallScreenHeader(
            title = "Today",
            subtitle = "Upcoming nudges from your notes",
            isSyncing = syncing,
            syncHint = syncHint,
            onSync = { viewModel.syncNow() },
            onSignOut = onLogout,
        )
        Spacer(Modifier.height(16.dp))

        PullToRefreshBox(
            isRefreshing = syncing,
            onRefresh = { viewModel.syncNow() },
            modifier = Modifier.fillMaxSize(),
        ) {
            val grouped = groupReminders(reminders, notes)
            if (reminders.isEmpty()) {
                RecallPanel {
                    Text("Nothing scheduled yet.", color = RecallColors.ParchmentMuted)
                }
            } else {
                LazyColumn {
                    grouped.forEach { (section, items) ->
                        if (items.isNotEmpty()) {
                            item {
                                Text(
                                    section.uppercase(),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = RecallColors.ParchmentMuted,
                                    modifier = Modifier.padding(bottom = 12.dp, top = 8.dp),
                                )
                            }
                            itemsIndexed(items) { _, item ->
                                TimelineReminderCard(item, onOpenNote)
                                Spacer(Modifier.height(8.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TimelineReminderCard(
    data: ReminderRowData,
    onOpenNote: (String) -> Unit,
) {
    val formatter = DateTimeFormatter.ofPattern("EEE, MMM d · h:mm a")
    val formatted = Instant.parse(data.reminder.fireAt)
        .atZone(ZoneId.systemDefault())
        .format(formatter)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenNote(data.reminder.noteId) },
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(RecallColors.Copper),
            )
            Box(
                Modifier
                    .width(1.dp)
                    .height(48.dp)
                    .background(RecallColors.BorderStrong),
            )
        }
        Spacer(Modifier.width(14.dp))
        RecallPanel(modifier = Modifier.weight(1f)) {
            Text(
                data.note?.title?.ifBlank { "Untitled" } ?: "Note",
                style = MaterialTheme.typography.titleMedium,
                color = RecallColors.Parchment,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                formatted,
                style = MaterialTheme.typography.labelSmall,
                color = RecallColors.ParchmentMuted,
            )
            data.reminder.repeatRule?.let {
                Spacer(Modifier.height(8.dp))
                Text(
                    it.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = RecallColors.Copper,
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(RecallColors.CopperDim)
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
    }
}

private data class ReminderRowData(val reminder: ReminderEntity, val note: NoteEntity?)

private fun groupReminders(
    reminders: List<ReminderEntity>,
    notes: List<NoteEntity>,
): List<Pair<String, List<ReminderRowData>>> {
    val noteMap = notes.associateBy { it.id }
    val zone = ZoneId.systemDefault()
    val now = Instant.now().atZone(zone)
    val startTomorrow = now.toLocalDate().plusDays(1).atStartOfDay(zone)
    val endTomorrow = startTomorrow.plusDays(1)
    val endWeek = now.toLocalDate().plusDays(7).atStartOfDay(zone)

    val today = mutableListOf<ReminderRowData>()
    val tomorrow = mutableListOf<ReminderRowData>()
    val week = mutableListOf<ReminderRowData>()
    val later = mutableListOf<ReminderRowData>()

    reminders.sortedBy { it.fireAt }.forEach { r ->
        val fire = Instant.parse(r.fireAt).atZone(zone)
        val row = ReminderRowData(r, noteMap[r.noteId])
        when {
            fire.isBefore(startTomorrow) -> today.add(row)
            fire.isBefore(endTomorrow) -> tomorrow.add(row)
            fire.isBefore(endWeek) -> week.add(row)
            else -> later.add(row)
        }
    }

    return listOf(
        "Today" to today,
        "Tomorrow" to tomorrow,
        "This week" to week,
        "Later" to later,
    )
}
