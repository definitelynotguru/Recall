package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun RecallScreenHeader(
    title: String,
    subtitle: String,
    isSyncing: Boolean,
    syncHint: String?,
    onSync: () -> Unit,
    onSignOut: () -> Unit,
) {
    var showLogoutDialog by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.displayLarge,
                    color = RecallColors.Parchment,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = RecallColors.ParchmentMuted,
                )
            }
            if (isSyncing) {
                CircularProgressIndicator(
                    modifier = Modifier.size(28.dp),
                    color = RecallColors.Copper,
                    strokeWidth = 2.dp,
                )
            } else {
                IconButton(onClick = onSync) {
                    Icon(
                        Icons.Outlined.Sync,
                        contentDescription = "Sync with server",
                        tint = RecallColors.Copper,
                    )
                }
            }
            IconButton(onClick = { showLogoutDialog = true }) {
                Icon(
                    Icons.AutoMirrored.Outlined.Logout,
                    contentDescription = "Sign out",
                    tint = RecallColors.ParchmentMuted,
                )
            }
        }
        syncHint?.let {
            Spacer(Modifier.height(6.dp))
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = if (it.startsWith("Sync failed")) RecallColors.Error else RecallColors.ParchmentMuted,
            )
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            containerColor = RecallColors.InkSurface,
            title = { Text("Sign out?", color = RecallColors.Parchment) },
            text = {
                Text(
                    "Your notes stay on this phone. Tap Sync before signing out if you have unsaved changes to upload.",
                    color = RecallColors.ParchmentMuted,
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onSignOut()
                    },
                ) {
                    Text("Sign out", color = RecallColors.Copper)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel", color = RecallColors.ParchmentMuted)
                }
            },
        )
    }
}
