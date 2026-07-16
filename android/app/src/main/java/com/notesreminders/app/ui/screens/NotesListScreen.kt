package com.notesreminders.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.components.RecallAlertDialog
import com.notesreminders.app.ui.components.RecallDialogDestructiveButton
import com.notesreminders.app.ui.components.RecallDialogTextButton
import com.notesreminders.app.ui.components.RecallPanel
import com.notesreminders.app.ui.components.RecallPanelStyle
import com.notesreminders.app.ui.components.RecallScreenHeader
import com.notesreminders.app.ui.theme.recallFieldColors
import com.notesreminders.app.ui.theme.recallTagFilterChipColors

@Composable
fun NotesListScreen(
    viewModel: AppViewModel,
    onOpenNote: (String) -> Unit,
    onLogout: () -> Unit,
) {
    val notes by viewModel.notes.collectAsState()
    val allTags by viewModel.tags.collectAsState()
    val noteStatus by viewModel.noteStatus.collectAsState()
    val noteQuery by viewModel.noteQuery.collectAsState()
    val noteTagFilter by viewModel.noteTagFilter.collectAsState()
    val syncing by viewModel.isSyncing.collectAsState()
    val syncHint by viewModel.syncHint.collectAsState()
    val hasPendingSync by viewModel.hasPendingSync.collectAsState()
    var noteToDelete by remember { mutableStateOf<NoteEntity?>(null) }
    var localQuery by remember { mutableStateOf(noteQuery) }
    var localStatus by remember { mutableStateOf(noteStatus) }
    var localTagFilter by remember { mutableStateOf(noteTagFilter) }

    LaunchedEffect(localStatus, localQuery, localTagFilter) {
        viewModel.setNoteListFilter(localStatus, localQuery, localTagFilter)
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.padding(horizontal = 20.dp)) {
            Spacer(Modifier.height(16.dp))
            RecallScreenHeader(
                title = "Notes",
                subtitle = "Tap a note to edit · swipe left to delete",
                isSyncing = syncing,
                syncHint = syncHint,
                hasPendingSync = hasPendingSync,
                onSync = { viewModel.syncNow() },
                onSignOut = onLogout,
            )
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = localQuery,
                onValueChange = { localQuery = it },
                label = { Text("Search") },
                modifier = Modifier.fillMaxWidth(),
                colors = recallFieldColors(),
            )
            Row {
                TextButton(onClick = { localStatus = "active" }) {
                    Text(
                        "Active",
                        color = if (localStatus == "active") {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                    )
                }
                TextButton(onClick = { localStatus = "archived" }) {
                    Text(
                        "Archived",
                        color = if (localStatus == "archived") {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                    )
                }
            }
            if (allTags.isNotEmpty()) {
                Spacer(Modifier.height(4.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    TagFilterChip(
                        label = "All tags",
                        selected = localTagFilter == null,
                        onClick = { localTagFilter = null },
                    )
                    allTags.forEach { tag ->
                        TagFilterChip(
                            label = tag.name,
                            selected = localTagFilter == tag.id,
                            onClick = {
                                localTagFilter = if (localTagFilter == tag.id) null else tag.id
                            },
                        )
                    }
                }
            }
            Spacer(Modifier.height(8.dp))

            PullToRefreshBox(
                isRefreshing = syncing,
                onRefresh = { viewModel.syncNow() },
                modifier = Modifier.fillMaxSize(),
            ) {
                if (notes.isEmpty()) {
                    RecallPanel(
                        modifier = Modifier.padding(top = 12.dp),
                        style = RecallPanelStyle.Raised,
                    ) {
                        Text(
                            "Your notebook is ready",
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Text(
                            "Create a blank note or start from a template.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                } else {
                    LazyColumn {
                        items(notes, key = { note -> note.id }) { note ->
                            SwipeableNoteRow(
                                note = note,
                                onOpen = onOpenNote,
                                onDeleteRequest = { noteToDelete = note },
                                onTogglePin = {
                                    viewModel.setNotePinned(note.id, note.pinnedAt == null)
                                },
                                onToggleArchive = {
                                    viewModel.setNoteArchived(note.id, note.status != "archived")
                                },
                            )
                        }
                    }
                }
            }
        }

        val templates by viewModel.observeTemplates().collectAsStateWithLifecycle(initialValue = emptyList())
        var showTemplateMenu by remember { mutableStateOf(false) }

        Column(
            Modifier
                .align(Alignment.BottomEnd)
                .padding(24.dp),
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (showTemplateMenu) {
                DropdownMenu(
                    expanded = true,
                    onDismissRequest = { showTemplateMenu = false },
                ) {
                    DropdownMenuItem(
                        text = { Text("Blank note") },
                        onClick = {
                            showTemplateMenu = false
                            viewModel.createNote(onOpenNote)
                        },
                        leadingIcon = { Icon(Icons.Default.Add, contentDescription = null) },
                    )
                    if (templates.isNotEmpty()) {
                        templates.forEach { tpl ->
                            DropdownMenuItem(
                                text = { Text(tpl.title.ifBlank { "Untitled template" }) },
                                onClick = {
                                    showTemplateMenu = false
                                    viewModel.createNoteFromTemplate(tpl, onOpenNote)
                                },
                            )
                        }
                    }
                }
            }
            FloatingActionButton(
                onClick = {
                    if (templates.isEmpty()) {
                        viewModel.createNote(onOpenNote)
                    } else {
                        showTemplateMenu = !showTemplateMenu
                    }
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            ) {
                Icon(Icons.Default.Add, contentDescription = "New note")
            }
        }
    }

    noteToDelete?.let { note ->
        RecallAlertDialog(
            onDismissRequest = { noteToDelete = null },
            title = "Delete note?",
            text = {
                Text(
                    "\"${note.title.ifBlank { "Untitled" }}\" and its reminders will be removed on this device.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            confirmButton = {
                RecallDialogDestructiveButton("Delete") {
                    val id = note.id
                    noteToDelete = null
                    viewModel.deleteNote(id) { }
                }
            },
            dismissButton = {
                RecallDialogTextButton(
                    "Cancel",
                    { noteToDelete = null },
                    MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
        )
    }
}

@Composable
private fun TagFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        colors = recallTagFilterChipColors(),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeableNoteRow(
    note: NoteEntity,
    onOpen: (String) -> Unit,
    onDeleteRequest: () -> Unit,
    onTogglePin: () -> Unit,
    onToggleArchive: () -> Unit,
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) {
                onDeleteRequest()
            }
            false
        },
    )

    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            Box(
                Modifier
                    .fillMaxSize()
                    .padding(vertical = 6.dp)
                    .clip(MaterialTheme.shapes.medium)
                    .background(MaterialTheme.colorScheme.errorContainer),
                contentAlignment = Alignment.CenterEnd,
            ) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.padding(end = 28.dp),
                )
            }
        },
    ) {
        RecallPanel(modifier = Modifier.padding(vertical = 6.dp)) {
            NoteRowContent(note, onOpen, onTogglePin, onToggleArchive)
        }
    }
}

@Composable
private fun NoteRowContent(
    note: NoteEntity,
    onClick: (String) -> Unit,
    onTogglePin: () -> Unit,
    onToggleArchive: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            Modifier
                .weight(1f)
                .clickable { onClick(note.id) }
                .padding(horizontal = 12.dp, vertical = 4.dp),
        ) {
            Text(
                note.title.ifBlank { "Untitled" },
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                note.body.replace(Regex("[#*_`\n]"), " ").trim().ifBlank { "Empty page" },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            TextButton(onClick = onTogglePin) {
                Text(
                    if (note.pinnedAt == null) "Pin" else "Unpin",
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            TextButton(onClick = onToggleArchive) {
                Text(
                    if (note.status == "archived") "Unarchive" else "Archive",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
