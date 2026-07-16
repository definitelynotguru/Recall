package com.notesreminders.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun RecallScreenHeader(
    title: String,
    subtitle: String,
    isSyncing: Boolean,
    syncHint: String?,
    hasPendingSync: Boolean,
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
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (isSyncing) {
                CircularProgressIndicator(
                    modifier = Modifier.size(28.dp),
                    color = MaterialTheme.colorScheme.primary,
                    strokeWidth = 2.dp,
                )
            } else {
                IconButton(onClick = onSync) {
                    Icon(
                        Icons.Outlined.Sync,
                        contentDescription = "Sync with server",
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            IconButton(onClick = { showLogoutDialog = true }) {
                Icon(
                    Icons.AutoMirrored.Outlined.Logout,
                    contentDescription = "Sign out",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        if (hasPendingSync && !isSyncing) {
            Spacer(Modifier.height(8.dp))
            Text(
                "Unsynced changes · tap Sync",
                modifier = Modifier
                    .clip(MaterialTheme.shapes.small)
                    .minimumInteractiveComponentSize()
                    .clickable(onClick = onSync)
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        syncHint?.let {
            Spacer(Modifier.height(6.dp))
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = if (it.startsWith("Sync failed")) {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
        }
    }

    if (showLogoutDialog) {
        RecallAlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = "Sign out?",
            text = {
                Text(
                    "Your notes stay on this phone. Tap Sync before signing out if you have unsaved changes to upload.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            confirmButton = {
                RecallDialogConfirmButton(
                    label = "Sign out",
                    onClick = {
                        showLogoutDialog = false
                        onSignOut()
                    },
                )
            },
            dismissButton = {
                RecallDialogTextButton(
                    "Cancel",
                    { showLogoutDialog = false },
                    MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
        )
    }
}
