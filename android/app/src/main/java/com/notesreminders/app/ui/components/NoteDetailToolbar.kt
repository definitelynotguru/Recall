package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.outlined.Archive
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.outlined.Unarchive
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.ui.Modifier

@Composable
fun NoteDetailToolbar(
    isPinned: Boolean,
    isArchived: Boolean,
    preview: Boolean,
    onBack: () -> Unit,
    onSync: () -> Unit,
    onTogglePin: () -> Unit,
    onToggleArchive: () -> Unit,
    onTogglePreview: () -> Unit,
    onHistory: () -> Unit,
    onDelete: () -> Unit,
) {
    var menuExpanded by remember { mutableStateOf(false) }

    Row(Modifier.fillMaxWidth()) {
        IconButton(onClick = onBack) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = MaterialTheme.colorScheme.onSurface,
            )
        }
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onSync) {
            Icon(
                Icons.Outlined.Sync,
                contentDescription = "Sync",
                tint = MaterialTheme.colorScheme.primary,
            )
        }
        TextButton(onClick = onTogglePreview) {
            Text(if (preview) "Edit" else "Preview")
        }
        IconButton(onClick = { menuExpanded = true }) {
            Icon(Icons.Outlined.MoreVert, contentDescription = "More note actions")
        }
        DropdownMenu(
            expanded = menuExpanded,
            onDismissRequest = { menuExpanded = false },
        ) {
            DropdownMenuItem(
                text = { Text("Version history") },
                leadingIcon = { Icon(Icons.Outlined.History, contentDescription = null) },
                onClick = {
                    menuExpanded = false
                    onHistory()
                },
            )
            DropdownMenuItem(
                text = { Text(if (isPinned) "Unpin note" else "Pin note") },
                leadingIcon = { Icon(Icons.Outlined.PushPin, contentDescription = null) },
                onClick = {
                    menuExpanded = false
                    onTogglePin()
                },
            )
            DropdownMenuItem(
                text = { Text(if (isArchived) "Unarchive note" else "Archive note") },
                leadingIcon = {
                    Icon(
                        if (isArchived) Icons.Outlined.Unarchive else Icons.Outlined.Archive,
                        contentDescription = null,
                    )
                },
                onClick = {
                    menuExpanded = false
                    onToggleArchive()
                },
            )
            DropdownMenuItem(
                text = { Text("Delete note", color = MaterialTheme.colorScheme.error) },
                leadingIcon = {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error,
                    )
                },
                onClick = {
                    menuExpanded = false
                    onDelete()
                },
            )
        }
    }
}
