package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.local.NoteConflictEntity
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun NoteConflictBanner(
    conflict: NoteConflictEntity?,
    onKeepLocal: () -> Unit,
    onKeepServer: () -> Unit,
) {
    conflict ?: return
    Spacer(Modifier.height(12.dp))
    RecallPanel {
        Text(
            "Sync conflict on this note",
            style = MaterialTheme.typography.titleMedium,
            color = RecallColors.Parchment,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Server copy is newer. Choose which version to keep.",
            style = MaterialTheme.typography.bodySmall,
            color = RecallColors.ParchmentMuted,
        )
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = onKeepLocal) {
                Text("Keep local", color = RecallColors.Copper)
            }
            TextButton(onClick = onKeepServer) {
                Text("Keep server", color = RecallColors.Copper)
            }
        }
    }
}
