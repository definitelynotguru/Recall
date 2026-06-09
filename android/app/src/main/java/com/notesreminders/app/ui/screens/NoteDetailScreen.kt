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
import com.notesreminders.app.ui.components.DetectedRemindersDialog
import com.notesreminders.app.ui.components.RecallPanel
import com.notesreminders.app.ui.components.ReminderScheduleDialog
import com.notesreminders.app.ui.components.formatReminderFireAt
import com.notesreminders.app.ui.components.parseReminderTimeFields
import com.notesreminders.app.ui.theme.RecallColors
import io.noties.markwon.Markwon
import java.time.LocalDate
import java.time.ZoneId

@Composable
fun NoteDetailScreen(
    noteId: String,
    viewModel: AppViewModel,
    onBack: () -> Unit,
    onDeleted: () -> Unit,
    onRequestExactAlarms: () -> Unit = {},
) {
    var title by remember(noteId) { mutableStateOf("") }
    var body by remember(noteId) { mutableStateOf("") }
    var preview by remember(noteId) { mutableStateOf(false) }
    var reminders by remember(noteId) { mutableStateOf<List<ReminderEntity>>(emptyList()) }
    var showReminderDialog by remember(noteId) { mutableStateOf(false) }
    var editingReminder by remember(noteId) { mutableStateOf<ReminderEntity?>(null) }
    var reminderDate by remember(noteId) { mutableStateOf(LocalDate.now().toString()) }
    var reminderHour by remember(noteId) { mutableStateOf(9) }
    var reminderMinute by remember(noteId) { mutableStateOf(0) }
    var repeatRule by remember(noteId) { mutableStateOf("") }
    var showDetectDialog by remember(noteId) { mutableStateOf(false) }
    var detectedList by remember(noteId) { mutableStateOf<List<DetectedReminder>>(emptyList()) }
    var selectedDetected by remember(noteId) { mutableStateOf<Set<String>>(emptySet()) }
    var fetchingReminders by remember(noteId) { mutableStateOf(false) }
    var showDeleteNoteDialog by remember(noteId) { mutableStateOf(false) }
    var reminderToDelete by remember(noteId) { mutableStateOf<ReminderEntity?>(null) }

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
        reminderHour = viewModel.userPrefs.defaultReminderHour
        reminderMinute = viewModel.userPrefs.defaultReminderMinute
        repeatRule = ""
        showReminderDialog = true
    }

    fun openEditDialog(reminder: ReminderEntity) {
        editingReminder = reminder
        val (d, h, m) = parseReminderTimeFields(reminder.fireAt)
        reminderDate = d
        reminderHour = h
        reminderMinute = m
        repeatRule = reminder.repeatRule ?: ""
        showReminderDialog = true
    }

    fun saveReminderFromDialog() {
        val zone = ZoneId.systemDefault()
        val local = LocalDate.parse(reminderDate)
            .atTime(reminderHour.coerceIn(0, 23), reminderMinute.coerceIn(0, 59))
            .atZone(zone)
        val fireAt = local.toInstant().toString()
        val tz = zone.id
        val repeat = repeatRule.ifBlank { null }
        showReminderDialog = false
        val editing = editingReminder
        editingReminder = null
        onRequestExactAlarms()
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
            IconButton(onClick = { showDeleteNoteDialog = true }) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete note",
                    tint = RecallColors.Error,
                )
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
                "Reminders notify on this device. Sync uploads changes to the web.",
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
                    selectedDetected = found
                        .filter { it.confidence == "high" }
                        .map { it.id }
                        .toSet()
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
                            formatReminderFireAt(r.fireAt),
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
                        IconButton(onClick = { reminderToDelete = r }) {
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

    DetectedRemindersDialog(
        open = showDetectDialog,
        detected = detectedList,
        selectedIds = selectedDetected,
        onToggle = { id, checked ->
            selectedDetected = if (checked) selectedDetected + id else selectedDetected - id
        },
        onDismiss = { showDetectDialog = false },
        onConfirm = {
            fetchingReminders = true
            val picks = detectedList.filter { selectedDetected.contains(it.id) }
            showDetectDialog = false
            viewModel.addRemindersFromDetection(noteId, picks) {
                fetchingReminders = false
                refreshReminders()
            }
        },
    )

    ReminderScheduleDialog(
        open = showReminderDialog,
        title = if (editingReminder != null) "Edit reminder" else "Schedule nudge",
        reminderDate = reminderDate,
        onDateChange = { reminderDate = it },
        hour24 = reminderHour,
        minute = reminderMinute,
        onTimeChange = { h, m ->
            reminderHour = h
            reminderMinute = m
        },
        use12Hour = viewModel.userPrefs.use12HourClock,
        repeatRule = repeatRule,
        onRepeatChange = { repeatRule = it },
        defaultHour = viewModel.userPrefs.defaultReminderHour,
        defaultMinute = viewModel.userPrefs.defaultReminderMinute,
        showDelete = editingReminder != null,
        onDelete = {
            reminderToDelete = editingReminder
            showReminderDialog = false
            editingReminder = null
        },
        onDismiss = {
            showReminderDialog = false
            editingReminder = null
        },
        onSave = { saveReminderFromDialog() },
    )

    if (showDeleteNoteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteNoteDialog = false },
            containerColor = RecallColors.InkSurface,
            title = { Text("Delete note?", color = RecallColors.Parchment) },
            text = {
                Text(
                    "This removes the note and all its reminders on this device. Sync to apply on web.",
                    color = RecallColors.ParchmentMuted,
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteNoteDialog = false
                        viewModel.flushNoteSave(noteId, title, body)
                        viewModel.deleteNote(noteId) { onDeleted() }
                    },
                ) {
                    Text("Delete", color = RecallColors.Error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteNoteDialog = false }) {
                    Text("Cancel", color = RecallColors.ParchmentMuted)
                }
            },
        )
    }

    reminderToDelete?.let { target ->
        AlertDialog(
            onDismissRequest = { reminderToDelete = null },
            containerColor = RecallColors.InkSurface,
            title = { Text("Delete reminder?", color = RecallColors.Parchment) },
            text = {
                Text(
                    formatReminderFireAt(target.fireAt),
                    color = RecallColors.ParchmentMuted,
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val id = target.id
                        reminderToDelete = null
                        viewModel.deleteReminder(id) { refreshReminders() }
                    },
                ) {
                    Text("Delete", color = RecallColors.Error)
                }
            },
            dismissButton = {
                TextButton(onClick = { reminderToDelete = null }) {
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
