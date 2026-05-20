package com.notesreminders.app.ui.screens

import android.widget.TextView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.reminders.DetectedReminder
import com.notesreminders.app.reminders.ReminderDetect
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.components.RecallPanel
import com.notesreminders.app.ui.theme.RecallColors
import io.noties.markwon.Markwon
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun NoteDetailScreen(
    noteId: String,
    viewModel: AppViewModel,
    onBack: () -> Unit,
) {
    var title by remember(noteId) { mutableStateOf("") }
    var body by remember(noteId) { mutableStateOf("") }
    var preview by remember(noteId) { mutableStateOf(false) }
    var reminders by remember(noteId) { mutableStateOf<List<ReminderEntity>>(emptyList()) }
    var showReminderDialog by remember(noteId) { mutableStateOf(false) }
    var editingReminder by remember(noteId) { mutableStateOf<ReminderEntity?>(null) }
    var reminderDate by remember(noteId) { mutableStateOf(LocalDate.now().toString()) }
    var reminderTime by remember(noteId) { mutableStateOf("09:00") }
    var repeatRule by remember(noteId) { mutableStateOf("") }
    var showDetectDialog by remember(noteId) { mutableStateOf(false) }
    var detectedList by remember(noteId) { mutableStateOf<List<DetectedReminder>>(emptyList()) }
    var selectedDetected by remember(noteId) { mutableStateOf<Set<String>>(emptySet()) }
    var fetchingReminders by remember(noteId) { mutableStateOf(false) }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = RecallColors.Copper,
        unfocusedBorderColor = RecallColors.BorderStrong,
        focusedTextColor = RecallColors.Parchment,
        unfocusedTextColor = RecallColors.Parchment,
        focusedLabelColor = RecallColors.ParchmentMuted,
        unfocusedLabelColor = RecallColors.ParchmentMuted,
    )

    val scope = rememberCoroutineScope()

    fun refreshReminders() {
        scope.launch {
            reminders = viewModel.getReminders(noteId)
        }
    }

    LaunchedEffect(noteId) {
        val note = viewModel.getNote(noteId)
        if (note != null) {
            title = note.title
            body = note.body
        }
        reminders = viewModel.getReminders(noteId)
    }

    DisposableEffect(noteId, title, body) {
        onDispose {
            viewModel.flushNoteSave(noteId, title, body)
        }
    }

    fun openCreateDialog() {
        editingReminder = null
        reminderDate = LocalDate.now().toString()
        reminderTime = "09:00"
        repeatRule = ""
        showReminderDialog = true
    }

    fun openEditDialog(reminder: ReminderEntity) {
        editingReminder = reminder
        val (d, t, r) = reminderToLocalFields(reminder)
        reminderDate = d
        reminderTime = t
        repeatRule = r
        showReminderDialog = true
    }

    fun saveReminderFromDialog() {
        val zone = ZoneId.systemDefault()
        val local = LocalDate.parse(reminderDate)
            .atTime(LocalTime.parse(reminderTime))
            .atZone(zone)
        val fireAt = local.toInstant().toString()
        val tz = zone.id
        val repeat = repeatRule.ifBlank { null }
        showReminderDialog = false
        val editing = editingReminder
        editingReminder = null
        if (editing != null) {
            viewModel.updateReminder(editing.id, fireAt, tz, repeat) {
                refreshReminders()
            }
        } else {
            viewModel.addReminder(noteId, fireAt, tz, repeat) {
                refreshReminders()
            }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Row(Modifier.fillMaxWidth()) {
            IconButton(onClick = {
                viewModel.flushNoteSave(noteId, title, body)
                onBack()
            }) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = RecallColors.Parchment,
                )
            }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = { viewModel.syncNow() }) {
                Icon(
                    Icons.Outlined.Sync,
                    contentDescription = "Sync",
                    tint = RecallColors.Copper,
                )
            }
            TextButton(onClick = { preview = !preview }) {
                Text(if (preview) "Edit" else "Preview", color = RecallColors.Copper)
            }
        }

        Text(
            "Saved on device · Sync uploads to web",
            style = MaterialTheme.typography.bodySmall,
            color = RecallColors.ParchmentMuted,
            modifier = Modifier.padding(bottom = 12.dp),
        )

        RecallPanel {
            OutlinedTextField(
                value = title,
                onValueChange = {
                    title = it
                    viewModel.scheduleNoteSave(noteId, title, body)
                },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth(),
                colors = fieldColors,
                textStyle = MaterialTheme.typography.headlineMedium.copy(
                    color = RecallColors.Parchment,
                ),
                singleLine = true,
            )
            Spacer(Modifier.height(16.dp))
            if (preview) {
                MarkdownPreview(body)
            } else {
                OutlinedTextField(
                    value = body,
                    onValueChange = {
                        body = it
                        viewModel.scheduleNoteSave(noteId, title, body)
                    },
                    label = { Text("Body — Markdown") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp),
                    colors = fieldColors,
                )
            }
        }

        Spacer(Modifier.height(28.dp))
        Text(
            "Reminders",
            style = MaterialTheme.typography.headlineMedium,
            color = RecallColors.Parchment,
        )
        Spacer(Modifier.height(8.dp))
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(RecallColors.CopperDim)
                .padding(14.dp),
        ) {
            Icon(Icons.Default.Notifications, null, tint = RecallColors.Copper)
            Spacer(Modifier.width(12.dp))
            Text(
                "Tap Sync after editing reminders so alarms stay in sync.",
                style = MaterialTheme.typography.bodySmall,
                color = RecallColors.ParchmentMuted,
            )
        }
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = { openCreateDialog() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = RecallColors.Copper,
                    contentColor = RecallColors.Ink,
                ),
            ) {
                Text("Add reminder")
            }
            Button(
                onClick = {
                    viewModel.flushNoteSave(noteId, title, body)
                    val existing = reminders.map { it.fireAt to it.repeatRule }
                    val prefs = viewModel.userPrefs
                    val found = ReminderDetect.detect(
                        title,
                        body,
                        prefs.defaultReminderHour,
                        prefs.defaultReminderMinute,
                    )
                        .filter { d -> !ReminderDetect.isDuplicate(d, existing) }
                    detectedList = found
                    selectedDetected = found.map { it.id }.toSet()
                    showDetectDialog = true
                },
                enabled = !fetchingReminders,
                colors = ButtonDefaults.buttonColors(
                    containerColor = RecallColors.InkSurface,
                    contentColor = RecallColors.Copper,
                ),
            ) {
                Text(if (fetchingReminders) "Scanning…" else "Fetch reminders")
            }
        }

        reminders.filter { it.status == "active" }.forEach { r ->
            Spacer(Modifier.height(10.dp))
            RecallPanel {
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            formatFireAt(r.fireAt),
                            style = MaterialTheme.typography.titleMedium,
                            color = RecallColors.Parchment,
                        )
                        r.repeatRule?.let {
                            Spacer(Modifier.height(4.dp))
                            Text(
                                it.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = RecallColors.Copper,
                            )
                        }
                    }
                    Row {
                        IconButton(onClick = { openEditDialog(r) }) {
                            Icon(
                                Icons.Default.Edit,
                                contentDescription = "Edit",
                                tint = RecallColors.Copper,
                            )
                        }
                        IconButton(onClick = {
                            viewModel.deleteReminder(r.id) {
                                refreshReminders()
                            }
                        }) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "Delete",
                                tint = RecallColors.ParchmentMuted,
                            )
                        }
                    }
                }
            }
        }
    }

    if (showDetectDialog) {
        AlertDialog(
            onDismissRequest = { showDetectDialog = false },
            containerColor = RecallColors.InkSurface,
            title = {
                Text("Detected reminders", color = RecallColors.Parchment)
            },
            text = {
                Column {
                    if (detectedList.isEmpty()) {
                        Text(
                            "No dates found. Try Day/Month/Year/Time fields or text like \"22 Oct 2026 at 3pm\". Mention birthday for yearly repeats.",
                            color = RecallColors.ParchmentMuted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    } else {
                        detectedList.forEach { d ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 6.dp),
                                verticalAlignment = Alignment.Top,
                            ) {
                                Checkbox(
                                    checked = selectedDetected.contains(d.id),
                                    onCheckedChange = { checked ->
                                        selectedDetected = if (checked) {
                                            selectedDetected + d.id
                                        } else {
                                            selectedDetected - d.id
                                        }
                                    },
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = RecallColors.Copper,
                                        checkmarkColor = RecallColors.Ink,
                                    ),
                                )
                                Column(Modifier.weight(1f)) {
                                    Text(d.label, color = RecallColors.Parchment)
                                    Text(
                                        formatFireAt(d.fireAt),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = RecallColors.ParchmentMuted,
                                    )
                                    Text(
                                        (d.repeatRule ?: "once").uppercase(),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = RecallColors.Copper,
                                    )
                                    Text(
                                        d.reason,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = RecallColors.ParchmentMuted,
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                if (detectedList.isNotEmpty()) {
                    TextButton(
                        onClick = {
                            fetchingReminders = true
                            val zone = ZoneId.systemDefault()
                            val picks = detectedList.filter { selectedDetected.contains(it.id) }
                            showDetectDialog = false
                            picks.forEach { d ->
                                viewModel.addReminder(
                                    noteId,
                                    d.fireAt,
                                    zone.id,
                                    d.repeatRule,
                                    onDone = null,
                                    autoSync = false,
                                )
                            }
                            if (viewModel.userPrefs.autoSyncAfterReminder) {
                                viewModel.syncNow(showSuccess = true)
                            }
                            fetchingReminders = false
                            refreshReminders()
                        },
                        enabled = selectedDetected.isNotEmpty(),
                    ) {
                        Text("Add selected", color = RecallColors.Copper)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showDetectDialog = false }) {
                    Text("Cancel", color = RecallColors.ParchmentMuted)
                }
            },
        )
    }

    if (showReminderDialog) {
        AlertDialog(
            onDismissRequest = {
                showReminderDialog = false
                editingReminder = null
            },
            containerColor = RecallColors.InkSurface,
            title = {
                Text(
                    if (editingReminder != null) "Edit reminder" else "Schedule nudge",
                    color = RecallColors.Parchment,
                )
            },
            text = {
                Column {
                    OutlinedTextField(
                        value = reminderDate,
                        onValueChange = { reminderDate = it },
                        label = { Text("Date (YYYY-MM-DD)") },
                        colors = fieldColors,
                        singleLine = true,
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = reminderTime,
                        onValueChange = { reminderTime = it },
                        label = { Text("Time (HH:mm)") },
                        colors = fieldColors,
                        singleLine = true,
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = repeatRule,
                        onValueChange = { repeatRule = it },
                        label = { Text("Repeat or empty") },
                        colors = fieldColors,
                        singleLine = true,
                    )
                    if (editingReminder != null) {
                        Spacer(Modifier.height(12.dp))
                        TextButton(
                            onClick = {
                                val id = editingReminder!!.id
                                showReminderDialog = false
                                editingReminder = null
                                viewModel.deleteReminder(id) {
                                    refreshReminders()
                                }
                            },
                        ) {
                            Text("Delete reminder", color = RecallColors.Error)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { saveReminderFromDialog() }) {
                    Text("Save", color = RecallColors.Copper)
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showReminderDialog = false
                    editingReminder = null
                }) {
                    Text("Cancel", color = RecallColors.ParchmentMuted)
                }
            },
        )
    }
}

@Composable
private fun MarkdownPreview(markdown: String) {
    val context = LocalContext.current
    val markwon = remember(context) { Markwon.create(context) }
    val rendered = remember(markdown) { markdown.ifBlank { "_Empty_" } }
    AndroidView(
        factory = { ctx ->
            TextView(ctx).apply {
                setTextColor(0xFFE8E4DC.toInt())
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
            }
        },
        update = { tv -> markwon.setMarkdown(tv, rendered) },
        modifier = Modifier.fillMaxWidth(),
    )
}

private fun formatFireAt(iso: String): String {
    val formatter = DateTimeFormatter.ofPattern("EEE, MMM d · h:mm a")
    return Instant.parse(iso).atZone(ZoneId.systemDefault()).format(formatter)
}

private fun reminderToLocalFields(reminder: ReminderEntity): Triple<String, String, String> {
    val zoned = Instant.parse(reminder.fireAt).atZone(ZoneId.systemDefault())
    val date = zoned.format(DateTimeFormatter.ISO_LOCAL_DATE)
    val time = zoned.format(DateTimeFormatter.ofPattern("HH:mm"))
    val repeat = reminder.repeatRule ?: ""
    return Triple(date, time, repeat)
}
