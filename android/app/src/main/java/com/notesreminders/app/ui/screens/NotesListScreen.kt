package com.notesreminders.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.components.RecallScreenHeader
import com.notesreminders.app.ui.theme.RecallColors
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun NotesListScreen(
    viewModel: AppViewModel,
    onOpenNote: (String) -> Unit,
    onLogout: () -> Unit,
) {
    val notes by viewModel.notes.collectAsState()
    val syncing by viewModel.isSyncing.collectAsState()
    val syncHint by viewModel.syncHint.collectAsState()
    val hasPendingSync by viewModel.hasPendingSync.collectAsState()

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.padding(horizontal = 20.dp)) {
            Spacer(Modifier.height(16.dp))
            RecallScreenHeader(
                title = "Notes",
                subtitle = "Edit here · tap Sync to pull from web",
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
                if (notes.isEmpty()) {
                    Text(
                        "Your notebook is empty.",
                        color = RecallColors.ParchmentMuted,
                        modifier = Modifier.padding(24.dp),
                    )
                } else {
                    LazyColumn {
                        itemsIndexed(notes) { _, note ->
                            NoteRow(note, onOpenNote)
                        }
                    }
                }
            }
        }

        FloatingActionButton(
            onClick = { viewModel.createNote(onOpenNote) },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(24.dp),
            containerColor = RecallColors.Copper,
            contentColor = RecallColors.Ink,
        ) {
            Icon(Icons.Default.Add, contentDescription = "New note")
        }
    }
}

@Composable
private fun NoteRow(note: NoteEntity, onClick: (String) -> Unit) {
    val date = Instant.parse(note.updatedAt)
        .atZone(ZoneId.systemDefault())
        .format(DateTimeFormatter.ofPattern("MMM d"))

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick(note.id) }
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .width(4.dp)
                .height(52.dp)
                .padding(start = 4.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(RecallColors.Copper, RecallColors.Copper.copy(alpha = 0f)),
                    ),
                ),
        )
        Column(
            Modifier
                .weight(1f)
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            Text(
                note.title.ifBlank { "Untitled" },
                style = MaterialTheme.typography.titleMedium,
                color = RecallColors.Parchment,
            )
            Text(
                note.body.replace(Regex("[#*_`\n]"), " ").trim().ifBlank { "Empty page" },
                style = MaterialTheme.typography.bodySmall,
                color = RecallColors.ParchmentMuted,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            date,
            style = MaterialTheme.typography.labelSmall,
            color = RecallColors.ParchmentMuted,
            modifier = Modifier.padding(end = 8.dp),
        )
    }
}
