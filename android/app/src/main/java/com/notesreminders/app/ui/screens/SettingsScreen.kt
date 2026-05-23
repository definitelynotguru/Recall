package com.notesreminders.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.components.RecallPanel
import com.notesreminders.app.ui.components.RecallScreenHeader
import com.notesreminders.app.ui.theme.RecallColors
import java.time.ZoneId

@Composable
fun SettingsScreen(
    viewModel: AppViewModel,
    onLogout: () -> Unit,
    onReplayOnboarding: () -> Unit,
) {
    val syncing by viewModel.isSyncing.collectAsState()
    val syncHint by viewModel.syncHint.collectAsState()
    val hasPendingSync by viewModel.hasPendingSync.collectAsState()
    val prefs = viewModel.userPrefs
    val zone = ZoneId.systemDefault().id
    var debugMessage by remember { mutableStateOf<String?>(null) }
    var sendingDebug by remember { mutableStateOf(false) }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = RecallColors.Copper,
        unfocusedBorderColor = RecallColors.BorderStrong,
        focusedTextColor = RecallColors.Parchment,
        unfocusedTextColor = RecallColors.Parchment,
        focusedLabelColor = RecallColors.ParchmentMuted,
        unfocusedLabelColor = RecallColors.ParchmentMuted,
    )

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(16.dp))
        RecallScreenHeader(
            title = "Settings",
            subtitle = "Defaults and sync behavior",
            isSyncing = syncing,
            syncHint = syncHint,
            hasPendingSync = hasPendingSync,
            onSync = { viewModel.syncNow() },
            onSignOut = onLogout,
        )
        Spacer(Modifier.height(20.dp))

        RecallPanel {
            Text("Reminder defaults", style = MaterialTheme.typography.titleMedium, color = RecallColors.Parchment)
            Spacer(Modifier.height(8.dp))
            Text(
                "Timezone: $zone · used when Fetch reminders finds no time",
                style = MaterialTheme.typography.bodySmall,
                color = RecallColors.ParchmentMuted,
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = prefs.defaultReminderHour.toString(),
                onValueChange = { prefs.defaultReminderHour = it.toIntOrNull() ?: 9 },
                label = { Text("Default hour (0–23)") },
                colors = fieldColors,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = prefs.defaultReminderMinute.toString(),
                onValueChange = { prefs.defaultReminderMinute = it.toIntOrNull() ?: 0 },
                label = { Text("Default minute") },
                colors = fieldColors,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Auto-sync after reminder edits", color = RecallColors.ParchmentMuted)
                Switch(
                    checked = prefs.autoSyncAfterReminder,
                    onCheckedChange = { prefs.autoSyncAfterReminder = it },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = RecallColors.Ink,
                        checkedTrackColor = RecallColors.Copper,
                    ),
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        RecallPanel {
            Text("Debug", style = MaterialTheme.typography.titleMedium, color = RecallColors.Parchment)
            Spacer(Modifier.height(8.dp))
            Text(
                "Send a diagnostic report to the server (no passwords). Use after sync errors — view reports on web Settings.",
                style = MaterialTheme.typography.bodySmall,
                color = RecallColors.ParchmentMuted,
            )
            Spacer(Modifier.height(12.dp))
            TextButton(
                onClick = {
                    if (sendingDebug) return@TextButton
                    sendingDebug = true
                    debugMessage = null
                    viewModel.sendDebugReport { msg ->
                        debugMessage = msg
                        sendingDebug = false
                    }
                },
                enabled = !sendingDebug,
            ) {
                Text(
                    if (sendingDebug) "Sending…" else "Send debug report",
                    color = RecallColors.Copper,
                )
            }
            debugMessage?.let { msg ->
                Spacer(Modifier.height(8.dp))
                Text(msg, style = MaterialTheme.typography.bodySmall, color = RecallColors.ParchmentMuted)
            }
        }

        Spacer(Modifier.height(16.dp))
        RecallPanel {
            Text("Introduction", style = MaterialTheme.typography.titleMedium, color = RecallColors.Parchment)
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onReplayOnboarding) {
                Text("Replay introduction", color = RecallColors.Copper)
            }
        }
    }
}
