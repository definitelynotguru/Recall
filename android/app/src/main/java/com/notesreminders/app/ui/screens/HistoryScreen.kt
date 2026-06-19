package com.notesreminders.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.reminders.RepeatUtils
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.components.RecallPanel
import com.notesreminders.app.ui.components.RecallScreenHeader
import com.notesreminders.app.ui.components.formatReminderFireAt
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun HistoryScreen(
    viewModel: AppViewModel,
    onOpenNote: (String) -> Unit,
    onLogout: () -> Unit,
) {
    val notes by viewModel.notes.collectAsState()
    val history by viewModel.historyReminders.collectAsState()
    val syncing by viewModel.isSyncing.collectAsState()
    val syncHint by viewModel.syncHint.collectAsState()
    val hasPendingSync by viewModel.hasPendingSync.collectAsState()
    val noteMap = notes.associateBy { it.id }

    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(16.dp))
        RecallScreenHeader(
            title = "History",
            subtitle = "Completed and cancelled reminders",
            isSyncing = syncing,
            syncHint = syncHint,
            hasPendingSync = hasPendingSync,
            onSync = { viewModel.syncNow() },
            onSignOut = onLogout,
        )
        Spacer(Modifier.height(16.dp))
        PullToRefreshBox(
            isRefreshing = syncing,
            onRefresh = { viewModel.syncNow() },
            modifier = Modifier.fillMaxSize(),
        ) {
            if (history.isEmpty()) {
                RecallPanel {
                    Text("No completed or cancelled reminders yet.", color = RecallColors.ParchmentMuted)
                }
            } else {
                LazyColumn {
                    items(history, key = { it.id }) { reminder ->
                        HistoryReminderRow(
                            reminder = reminder,
                            note = noteMap[reminder.noteId],
                            onOpenNote = onOpenNote,
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryReminderRow(
    reminder: ReminderEntity,
    note: NoteEntity?,
    onOpenNote: (String) -> Unit,
) {
    RecallPanel(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenNote(reminder.noteId) },
    ) {
        Text(
            note?.title?.ifBlank { "Untitled" } ?: "Note",
            style = MaterialTheme.typography.titleMedium,
            color = RecallColors.Parchment,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "${reminder.status} · ${formatReminderFireAt(reminder.completedAt ?: reminder.fireAt)}",
            style = MaterialTheme.typography.bodySmall,
            color = RecallColors.ParchmentMuted,
        )
        reminder.repeatRule?.let { rule ->
            Spacer(Modifier.height(6.dp))
            Text(
                RepeatUtils.formatRepeatLabel(rule),
                style = MaterialTheme.typography.labelSmall,
                color = RecallColors.Copper,
            )
        }
    }
}
