package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.outlined.Archive
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.outlined.Unarchive
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.notesreminders.app.ui.theme.RecallColors

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
    onDelete: () -> Unit,
) {
    Row(Modifier.fillMaxWidth()) {
        IconButton(onClick = onBack) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = RecallColors.Parchment,
            )
        }
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onSync) {
            Icon(
                Icons.Outlined.Sync,
                contentDescription = "Sync",
                tint = RecallColors.Copper,
            )
        }
        IconButton(onClick = onTogglePin) {
            Icon(
                Icons.Outlined.PushPin,
                contentDescription = if (isPinned) "Unpin" else "Pin",
                tint = if (isPinned) RecallColors.Copper else RecallColors.ParchmentMuted,
            )
        }
        IconButton(onClick = onToggleArchive) {
            Icon(
                if (isArchived) Icons.Outlined.Unarchive else Icons.Outlined.Archive,
                contentDescription = if (isArchived) "Unarchive" else "Archive",
                tint = if (isArchived) RecallColors.Copper else RecallColors.ParchmentMuted,
            )
        }
        TextButton(onClick = onTogglePreview) {
            Text(if (preview) "Edit" else "Preview", color = RecallColors.Copper)
        }
        IconButton(onClick = onDelete) {
            Icon(
                Icons.Default.Delete,
                contentDescription = "Delete note",
                tint = RecallColors.Error,
            )
        }
    }
}
