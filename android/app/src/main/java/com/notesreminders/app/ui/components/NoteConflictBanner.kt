package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.local.NoteConflictEntity

@Composable
fun NoteConflictBanner(
    conflict: NoteConflictEntity?,
    onKeepLocal: () -> Unit,
    onKeepServer: () -> Unit,
    onMerge: () -> Unit,
) {
    conflict ?: return
    Spacer(Modifier.height(12.dp))
    RecallPanel(style = RecallPanelStyle.Raised) {
        Text(
            "Sync conflict on this note",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "This note changed in two places. Review both versions and choose how to resolve.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        ConflictVersionPanel(
            label = "Local",
            title = conflict.localTitle,
            body = conflict.localBody,
        )
        Spacer(Modifier.height(10.dp))
        ConflictVersionPanel(
            label = "Server",
            title = conflict.serverTitle,
            body = conflict.serverBody,
        )
        Spacer(Modifier.height(10.dp))
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            TextButton(onClick = onKeepLocal) {
                Text("Keep local")
            }
            TextButton(onClick = onKeepServer) {
                Text("Keep server")
            }
            TextButton(onClick = onMerge) {
                Text("Merge both")
            }
        }
    }
}

@Composable
private fun ConflictVersionPanel(
    label: String,
    title: String,
    body: String,
) {
    Column(Modifier.fillMaxWidth()) {
        Text(
            "$label · ${title.ifBlank { "Untitled" }}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            body.ifBlank { "(empty)" }.take(280),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
