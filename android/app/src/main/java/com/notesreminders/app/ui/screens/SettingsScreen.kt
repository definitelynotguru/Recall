package com.notesreminders.app.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.notesreminders.app.BuildConfig
import android.app.Activity
import com.notesreminders.app.data.ConflictResolution
import com.notesreminders.app.reminders.ReminderPermissions
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.components.RecallPanel
import com.notesreminders.app.ui.components.RecallScreenHeader
import com.notesreminders.app.ui.theme.recallFieldColors
import com.notesreminders.app.ui.theme.recallPrimaryButtonColors
import com.notesreminders.app.ui.theme.recallSwitchColors
import java.time.ZoneId

@Composable
fun SettingsScreen(
    viewModel: AppViewModel,
    onLogout: () -> Unit,
    onReplayOnboarding: () -> Unit,
    onOpenNote: (String) -> Unit,
) {
    val syncing by viewModel.isSyncing.collectAsState()
    val syncHint by viewModel.syncHint.collectAsState()
    val hasPendingSync by viewModel.hasPendingSync.collectAsState()
    val conflicts by viewModel.conflicts.collectAsState()
    val syncErrors by viewModel.syncErrors.collectAsState()
    val prefs = viewModel.userPrefs
    val context = LocalContext.current
    val zone = ZoneId.systemDefault().id
    var debugMessage by remember { mutableStateOf<String?>(null) }
    var backupMessage by remember { mutableStateOf<String?>(null) }
    var sendingDebug by remember { mutableStateOf(false) }
    var updateMessage by remember { mutableStateOf<String?>(null) }
    var updating by remember { mutableStateOf(false) }
    val activity = context as? Activity
    val exportBackup = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json"),
    ) { uri ->
        uri?.let { viewModel.exportBackup(it) { msg -> backupMessage = msg } }
    }
    val exportMarkdown = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/zip"),
    ) { uri ->
        uri?.let { viewModel.exportMarkdown(it) { msg -> backupMessage = msg } }
    }
    val importBackup = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri ->
        uri?.let { viewModel.importBackup(it) { msg -> backupMessage = msg } }
    }

    val fieldColors = recallFieldColors()

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
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        "Install over current app",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                    colors = recallPrimaryButtonColors(),
                    contentPadding = PaddingValues(
                        horizontal = 16.dp,
                        vertical = 6.dp,
                    ),
                ) {
                    Text(
                        if (updating) "…" else "Update",
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
            updateMessage?.let { msg ->
                Spacer(Modifier.height(8.dp))
                Text(msg, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(Modifier.height(16.dp))
        RecallPanel {
            Text("Sync status", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(8.dp))
            val lastSync by viewModel.lastSyncAt.collectAsState()
            Text(
                lastSync?.let { "Last sync: $it" } ?: "Not synced yet on this device",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (hasPendingSync) {
                Spacer(Modifier.height(6.dp))
                Text(
                    "Pending local changes — tap Sync in the header",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = { viewModel.syncNow() },
                enabled = !syncing,
                colors = recallPrimaryButtonColors(),
            ) {
                Text(if (syncing) "Syncing…" else "Sync now")
            }
        }

        Spacer(Modifier.height(16.dp))
        RecallPanel {
            Text("Permissions", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(8.dp))
            val notificationsOk = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
            val exactAlarmsOk = !ReminderPermissions.needsExactAlarmPermission(context)
            Text(
                if (notificationsOk) "Notifications enabled" else "Notifications disabled — reminders won't appear",
                style = MaterialTheme.typography.bodySmall,
                color = if (notificationsOk) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                if (exactAlarmsOk) "Exact alarms allowed" else "Exact alarms off — timing may drift",
                style = MaterialTheme.typography.bodySmall,
                color = if (exactAlarmsOk) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error,
            )
            if (!exactAlarmsOk) {
                Spacer(Modifier.height(8.dp))
                TextButton(
                    onClick = {
                        context.startActivity(ReminderPermissions.exactAlarmSettingsIntent(context))
                    },
                ) {
                    Text("Open alarm settings")
                }
            }
        }

        if (syncErrors.isNotEmpty()) {
            Spacer(Modifier.height(16.dp))
            RecallPanel {
                Text("Skipped sync items", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Rows that failed validation and were not uploaded. Retry re-queues the item; Discard drops the report.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                syncErrors.take(12).forEach { error ->
                    Text(
                        "${error.entityType} · ${error.entityId.take(8)}\u2026",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        error.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    error.payload?.let { payload ->
                        Text(
                            "Payload: ${payload.take(80)}${if (payload.length > 80) "\u2026" else ""}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        "Detected ${error.detectedAt.take(10)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        TextButton(onClick = { viewModel.retrySyncError(error) }) {
                            Text("Retry")
                        }
                        TextButton(onClick = { viewModel.discardSyncError(error) }) {
                            Text("Discard")
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }

        Spacer(Modifier.height(16.dp))
        if (conflicts.isNotEmpty()) {
            RecallPanel {
                Text("Conflicts", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.height(8.dp))
                conflicts.forEach { conflict ->
                    Text(
                        "Note changed in two places",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    if (conflict.localTitle != conflict.serverTitle) {
                        Text(
                            "Title — local: ${conflict.localTitle.ifBlank { "Untitled" }}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            "Title — server: ${conflict.serverTitle.ifBlank { "Untitled" }}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        "Body — local: ${conflict.localBody.take(120)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        "Body — server: ${conflict.serverBody.take(120)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        TextButton(onClick = { viewModel.resolveConflict(conflict.id, ConflictResolution.KEEP_LOCAL) }) {
                            Text("Keep local")
                        }
                        TextButton(onClick = { viewModel.resolveConflict(conflict.id, ConflictResolution.KEEP_SERVER) }) {
                            Text("Keep server")
                        }
                        TextButton(onClick = { viewModel.resolveConflict(conflict.id, ConflictResolution.MERGE) }) {
                            Text("Merge both")
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }

        RecallPanel {
            Text("Backup", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(8.dp))
            Text(
                "Export notes as Markdown in a zip with metadata.json, or back up and restore everything as JSON.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Button(
                    onClick = { exportMarkdown.launch("recall-export.zip") },
                    colors = recallPrimaryButtonColors(),
                ) {
                    Text("Export Markdown")
                }
                TextButton(onClick = { exportBackup.launch("recall-backup.json") }) {
                    Text("Export JSON")
                }
                TextButton(onClick = { importBackup.launch(arrayOf("application/json", "text/*", "*/*")) }) {
                    Text("Import")
                }
            }
            backupMessage?.let { msg ->
                Spacer(Modifier.height(8.dp))
                Text(msg, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(Modifier.height(16.dp))
        TemplatesPanel(
            viewModel = viewModel,
            onOpenNote = onOpenNote,
        )

        Spacer(Modifier.height(16.dp))
        RecallPanel {
            Text("Reminder defaults", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(8.dp))
            Text(
                "Timezone: $zone · used when Fetch reminders finds no time",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                    Text("12-hour clock", color = MaterialTheme.colorScheme.onSurface)
                    Text(
                        "Reminder picker shows AM/PM",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(
                    checked = prefs.use12HourClock,
                    onCheckedChange = { prefs.use12HourClock = it },
                    colors = recallSwitchColors(),
                )
            }
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Auto-sync after reminder edits", color = MaterialTheme.colorScheme.onSurface)
                Switch(
                    checked = prefs.autoSyncAfterReminder,
                    onCheckedChange = { prefs.autoSyncAfterReminder = it },
                    colors = recallSwitchColors(),
                )
            }
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Auto-sync after note edits", color = MaterialTheme.colorScheme.onSurface)
                Switch(
                    checked = prefs.autoSyncAfterNote,
                    onCheckedChange = { prefs.autoSyncAfterNote = it },
                    colors = recallSwitchColors(),
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        RecallPanel {
            Text("Diagnostics", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(8.dp))
            Text(
                "Send a diagnostic report to the server (no passwords). Use after sync errors — view reports on web Settings.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            debugMessage?.let { msg ->
                Spacer(Modifier.height(8.dp))
                Text(msg, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(Modifier.height(16.dp))
        RecallPanel {
            Text("Introduction", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onReplayOnboarding) {
                Text("Replay introduction")
            }
        }
        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun TemplatesPanel(
    viewModel: AppViewModel,
    onOpenNote: (String) -> Unit,
) {
    val templates by viewModel.observeTemplates().collectAsStateWithLifecycle(initialValue = emptyList())
    var seedMsg by remember { mutableStateOf<String?>(null) }

    RecallPanel {
        Text("Templates", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(8.dp))
        Text(
            "Reusable note starters with {{date}}, {{time}}, and {{title}} variables. Hidden from your note list.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        if (templates.isEmpty()) {
            Text(
                "No templates yet.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            templates.forEach { tpl ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    TextButton(onClick = { onOpenNote(tpl.id) }) {
                        Text(tpl.title.ifBlank { "Untitled template" })
                    }
                    TextButton(onClick = { viewModel.deleteTemplate(tpl) }) {
                        Text("Delete", color = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Button(
                onClick = { viewModel.createTemplate(onOpenNote) },
                colors = recallPrimaryButtonColors(),
            ) {
                Text("New template")
            }
            TextButton(onClick = {
                viewModel.seedDefaultTemplates { count ->
                    seedMsg = if (count > 0) "Added $count default templates" else "Defaults already present"
                }
            }) {
                Text("Restore defaults")
            }
        }
        seedMsg?.let { msg ->
            Spacer(Modifier.height(8.dp))
            Text(msg, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
