package com.notesreminders.app.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.notesreminders.app.BuildConfig
import android.app.Activity
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
    val conflicts by viewModel.conflicts.collectAsState()
    val prefs = viewModel.userPrefs
    val zone = ZoneId.systemDefault().id
    var debugMessage by remember { mutableStateOf<String?>(null) }
    var backupMessage by remember { mutableStateOf<String?>(null) }
    var sendingDebug by remember { mutableStateOf(false) }
    var updateMessage by remember { mutableStateOf<String?>(null) }
    var updating by remember { mutableStateOf(false) }
    val activity = LocalContext.current as? Activity
    val exportBackup = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json"),
    ) { uri ->
        uri?.let { viewModel.exportBackup(it) { msg -> backupMessage = msg } }
    }
    val importBackup = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri ->
        uri?.let { viewModel.importBackup(it) { msg -> backupMessage = msg } }
    }

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
        Spacer(Modifier.height(12.dp))
        RecallPanel {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        "Recall ${BuildConfig.VERSION_NAME}",
                        style = MaterialTheme.typography.titleMedium,
                        color = RecallColors.Parchment,
                    )
                    Text(
                        "Install over current app",
                        style = MaterialTheme.typography.bodySmall,
                        color = RecallColors.ParchmentMuted,
                    )
                }
                Button(
                    onClick = {
                        val act = activity ?: return@Button
                        if (updating) return@Button
                        updating = true
                        updateMessage = null
                        viewModel.downloadAndInstallUpdate(act) { msg ->
                            updateMessage = msg
                            updating = false
                        }
                    },
                    enabled = !updating && activity != null,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = RecallColors.Copper,
                        contentColor = RecallColors.Ink,
                    ),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(
                        horizontal = 16.dp,
                        vertical = 6.dp,
                    ),
                ) {
                    Text(
                        if (updating) "…" else "Update",
                        fontSize = 14.sp,
                    )
                }
            }
            updateMessage?.let { msg ->
                Spacer(Modifier.height(8.dp))
                Text(msg, style = MaterialTheme.typography.bodySmall, color = RecallColors.ParchmentMuted)
            }
        }

        Spacer(Modifier.height(16.dp))
        if (conflicts.isNotEmpty()) {
            RecallPanel {
                Text("Conflicts", style = MaterialTheme.typography.titleMedium, color = RecallColors.Parchment)
                Spacer(Modifier.height(8.dp))
                conflicts.forEach { conflict ->
                    Text(
                        "Note changed in two places",
                        style = MaterialTheme.typography.bodyMedium,
                        color = RecallColors.Parchment,
                    )
                    Text(
                        "Local: ${conflict.localBody.take(80)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = RecallColors.ParchmentMuted,
                    )
                    Text(
                        "Server: ${conflict.serverBody.take(80)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = RecallColors.ParchmentMuted,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(onClick = { viewModel.resolveConflict(conflict.id, keepLocal = true) }) {
                            Text("Keep local", color = RecallColors.Copper)
                        }
                        TextButton(onClick = { viewModel.resolveConflict(conflict.id, keepLocal = false) }) {
                            Text("Keep server", color = RecallColors.Copper)
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
            Spacer(Modifier.height(16.dp))
        }

        Spacer(Modifier.height(16.dp))
        RecallPanel {
            Text("Backup", style = MaterialTheme.typography.titleMedium, color = RecallColors.Parchment)
            Spacer(Modifier.height(8.dp))
            Text(
                "Export or import notes, reminders, tags, and archived items as JSON.",
                style = MaterialTheme.typography.bodySmall,
                color = RecallColors.ParchmentMuted,
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { exportBackup.launch("recall-backup.json") },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = RecallColors.Copper,
                        contentColor = RecallColors.Ink,
                    ),
                ) {
                    Text("Export")
                }
                TextButton(onClick = { importBackup.launch(arrayOf("application/json", "text/*", "*/*")) }) {
                    Text("Import", color = RecallColors.Copper)
                }
            }
            backupMessage?.let { msg ->
                Spacer(Modifier.height(8.dp))
                Text(msg, style = MaterialTheme.typography.bodySmall, color = RecallColors.ParchmentMuted)
            }
        }

        Spacer(Modifier.height(16.dp))
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
                Column(Modifier.weight(1f)) {
                    Text("12-hour clock", color = RecallColors.Parchment)
                    Text(
                        "Reminder picker shows AM/PM",
                        style = MaterialTheme.typography.bodySmall,
                        color = RecallColors.ParchmentMuted,
                    )
                }
                Switch(
                    checked = prefs.use12HourClock,
                    onCheckedChange = { prefs.use12HourClock = it },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = RecallColors.Ink,
                        checkedTrackColor = RecallColors.Copper,
                    ),
                )
            }
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
