package com.notesreminders.app.ui.screens

import android.widget.TextView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.outlined.Archive
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.outlined.Unarchive
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
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
import com.notesreminders.app.ui.components.NextNudgeCard
import com.notesreminders.app.ui.components.RecallAlertDialog
import com.notesreminders.app.ui.components.RecallDialogDestructiveButton
import com.notesreminders.app.ui.components.RecallDialogTextButton
import com.notesreminders.app.ui.components.RecallPanel
import com.notesreminders.app.ui.components.ReminderScheduleDialog
import com.notesreminders.app.ui.components.formatReminderFireAt
import com.notesreminders.app.ui.components.rememberReminderScheduleState
import com.notesreminders.app.ui.components.pickNextReminder
import com.notesreminders.app.ui.theme.RecallColors
import com.notesreminders.app.ui.theme.recallFieldColors
import com.notesreminders.app.ui.theme.recallPrimaryButtonColors
import com.notesreminders.app.ui.theme.recallSecondaryButtonColors
import com.notesreminders.app.ui.theme.recallTagFilterChipColors
import io.noties.markwon.Markwon

@OptIn(ExperimentalLayoutApi::class)
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
    var hasLocalEdits by remember(noteId) { mutableStateOf(false) }
    val schedule = rememberReminderScheduleState(
        viewModel.userPrefs.defaultReminderHour,
        viewModel.userPrefs.defaultReminderMinute,
    )
    var showDetectDialog by remember(noteId) { mutableStateOf(false) }
    var detectedList by remember(noteId) { mutableStateOf<List<DetectedReminder>>(emptyList()) }
    var selectedDetected by remember(noteId) { mutableStateOf<Set<String>>(emptySet()) }
    var fetchingReminders by remember(noteId) { mutableStateOf(false) }
    var showDeleteNoteDialog by remember(noteId) { mutableStateOf(false) }
    var reminderToDelete by remember(noteId) { mutableStateOf<ReminderEntity?>(null) }
    var isPinned by remember(noteId) { mutableStateOf(false) }
    var isArchived by remember(noteId) { mutableStateOf(false) }
    var newTagName by remember(noteId) { mutableStateOf("") }
    var saveStatus by remember(noteId) { mutableStateOf("Saved") }

    val allTags by viewModel.tags.collectAsStateWithLifecycle()
    val noteTags by viewModel.observeTagsForNote(noteId).collectAsStateWithLifecycle(initialValue = emptyList())
    val observedNote by viewModel.observeNote(noteId).collectAsStateWithLifecycle(initialValue = null)
    val reminders by viewModel.observeRemindersForNote(noteId).collectAsStateWithLifecycle(initialValue = emptyList())
    val conflicts by viewModel.conflicts.collectAsStateWithLifecycle(initialValue = emptyList())
    val noteConflict = conflicts.firstOrNull { it.noteId == noteId }
    val selectedTagIds = remember(noteTags) { noteTags.map { it.id }.toSet() }

    val fieldColors = recallFieldColors()

    LaunchedEffect(observedNote, noteId) {
        val note = observedNote ?: return@LaunchedEffect
        if (!hasLocalEdits) {
            title = note.title
            body = note.body
            isPinned = note.pinnedAt != null
            isArchived = note.status == "archived"
        }
    }

    LaunchedEffect(title, body) {
        if (saveStatus == "Unsaved…") {
            delay(600)
            saveStatus = "Saved"
        }
    }

    LaunchedEffect(saveStatus) {
        if (saveStatus == "Saved") {
            hasLocalEdits = false
        }
    }

    DisposableEffect(noteId, title, body) {
        onDispose {
            viewModel.flushNoteSave(noteId, title, body)
        }
    }

    fun openCreateDialog() {
        schedule.openNew(
            viewModel.userPrefs.defaultReminderHour,
            viewModel.userPrefs.defaultReminderMinute,
        )
    }

    fun saveReminderFromDialog() {
        val (fireAt, tz) = schedule.fireAtAndTimezone()
        val repeat = schedule.repeatRule.ifBlank { null }
        val editing = schedule.editingReminder
        schedule.dismiss()
        onRequestExactAlarms()
        if (editing != null) {
            viewModel.updateReminder(editing.id, fireAt, tz, repeat)
        } else {
            viewModel.addReminder(noteId, fireAt, tz, repeat)
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
            IconButton(
                onClick = {
                    val pinned = !isPinned
                    isPinned = pinned
                    viewModel.setNotePinned(noteId, pinned)
                },
            ) {
                Icon(
                    Icons.Outlined.PushPin,
                    contentDescription = if (isPinned) "Unpin" else "Pin",
                    tint = if (isPinned) RecallColors.Copper else RecallColors.ParchmentMuted,
                )
            }
            IconButton(
                onClick = {
                    val archived = !isArchived
                    isArchived = archived
                    viewModel.setNoteArchived(noteId, archived)
                },
            ) {
                Icon(
                    if (isArchived) Icons.Outlined.Unarchive else Icons.Outlined.Archive,
                    contentDescription = if (isArchived) "Unarchive" else "Archive",
                    tint = if (isArchived) RecallColors.Copper else RecallColors.ParchmentMuted,
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

        noteConflict?.let { conflict ->
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
                    TextButton(onClick = { viewModel.resolveConflict(conflict.id, keepLocal = true) }) {
                        Text("Keep local", color = RecallColors.Copper)
                    }
                    TextButton(onClick = { viewModel.resolveConflict(conflict.id, keepLocal = false) }) {
                        Text("Keep server", color = RecallColors.Copper)
                    }
                }
            }
        }

        Text(
            "$saveStatus · Sync uploads to web",
            style = MaterialTheme.typography.bodySmall,
            color = RecallColors.ParchmentMuted,
            modifier = Modifier.padding(bottom = 12.dp),
        )

        RecallPanel {
            OutlinedTextField(
                value = title,
                onValueChange = {
                    title = it
                    hasLocalEdits = true
                    saveStatus = "Unsaved…"
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
                        hasLocalEdits = true
                        saveStatus = "Unsaved…"
                        viewModel.scheduleNoteSave(noteId, title, body)
                    },
                    label = { Text("Body — Markdown") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(360.dp),
                    colors = fieldColors,
                )
            }
        }

        Spacer(Modifier.height(28.dp))
        Text(
            "Tags",
            style = MaterialTheme.typography.headlineMedium,
            color = RecallColors.Parchment,
        )
        Spacer(Modifier.height(8.dp))
        RecallPanel {
            if (allTags.isNotEmpty()) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    allTags.forEach { tag ->
                        val selected = selectedTagIds.contains(tag.id)
                        FilterChip(
                            selected = selected,
                            onClick = {
                                if (selected) {
                                    viewModel.unassignTag(noteId, tag.id)
                                } else {
                                    viewModel.assignTag(noteId, tag.id)
                                }
                            },
                            label = { Text(tag.name) },
                            colors = recallTagFilterChipColors(),
                        )
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedTextField(
                    value = newTagName,
                    onValueChange = { newTagName = it },
                    label = { Text("New tag") },
                    modifier = Modifier.weight(1f),
                    colors = fieldColors,
                    singleLine = true,
                )
                Button(
                    onClick = {
                        val name = newTagName.trim()
                        if (name.isEmpty()) return@Button
                        viewModel.createTagAndAssign(noteId, name) {
                            newTagName = ""
                        }
                    },
                    colors = recallSecondaryButtonColors(),
                ) {
                    Text("Add tag")
                }
            }
        }

        Spacer(Modifier.height(16.dp))
        NextNudgeCard(
            reminder = pickNextReminder(reminders),
            noteTitle = title,
        )

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
                colors = recallPrimaryButtonColors(),
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
                colors = recallSecondaryButtonColors(),
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
                        IconButton(onClick = { schedule.openEdit(r) }) {
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
            }
        },
    )

    ReminderScheduleDialog(
        open = schedule.showDialog,
        title = if (schedule.editingReminder != null) "Edit reminder" else "Schedule nudge",
        reminderDate = schedule.reminderDate,
        onDateChange = { schedule.reminderDate = it },
        hour24 = schedule.reminderHour,
        minute = schedule.reminderMinute,
        onTimeChange = { h, m ->
            schedule.reminderHour = h
            schedule.reminderMinute = m
        },
        use12Hour = viewModel.userPrefs.use12HourClock,
        repeatRule = schedule.repeatRule,
        onRepeatChange = { schedule.repeatRule = it },
        defaultHour = viewModel.userPrefs.defaultReminderHour,
        defaultMinute = viewModel.userPrefs.defaultReminderMinute,
        showDelete = schedule.editingReminder != null,
        onDelete = {
            reminderToDelete = schedule.editingReminder
            schedule.dismiss()
        },
        onDismiss = { schedule.dismiss() },
        onSave = { saveReminderFromDialog() },
    )

    if (showDeleteNoteDialog) {
        RecallAlertDialog(
            onDismissRequest = { showDeleteNoteDialog = false },
            title = "Delete note?",
            text = {
                Text(
                    "This removes the note and all its reminders on this device. Sync to apply on web.",
                    color = RecallColors.ParchmentMuted,
                )
            },
            confirmButton = {
                RecallDialogDestructiveButton("Delete") {
                    showDeleteNoteDialog = false
                    viewModel.flushNoteSave(noteId, title, body)
                    viewModel.deleteNote(noteId) { onDeleted() }
                }
            },
            dismissButton = {
                RecallDialogTextButton("Cancel", { showDeleteNoteDialog = false }, RecallColors.ParchmentMuted)
            },
        )
    }

    reminderToDelete?.let { target ->
        RecallAlertDialog(
            onDismissRequest = { reminderToDelete = null },
            title = "Delete reminder?",
            text = {
                Text(
                    formatReminderFireAt(target.fireAt),
                    color = RecallColors.ParchmentMuted,
                )
            },
            confirmButton = {
                RecallDialogDestructiveButton("Delete") {
                    val id = target.id
                    reminderToDelete = null
                    viewModel.deleteReminder(id)
                }
            },
            dismissButton = {
                RecallDialogTextButton("Cancel", { reminderToDelete = null }, RecallColors.ParchmentMuted)
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
