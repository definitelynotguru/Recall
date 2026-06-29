package com.notesreminders.app.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.reminders.DetectedReminder
import com.notesreminders.app.reminders.ReminderDetect
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.components.DetectedRemindersDialog
import com.notesreminders.app.ui.components.NextNudgeCard
import com.notesreminders.app.ui.components.NoteConflictBanner
import com.notesreminders.app.ui.components.NoteDetailToolbar
import com.notesreminders.app.ui.components.NoteEditorSection
import com.notesreminders.app.ui.components.NoteReminderSection
import com.notesreminders.app.ui.components.NoteTagSection
import com.notesreminders.app.ui.components.RecallAlertDialog
import com.notesreminders.app.ui.components.RecallDialogDestructiveButton
import com.notesreminders.app.ui.components.RecallDialogTextButton
import com.notesreminders.app.ui.components.ReminderScheduleDialog
import com.notesreminders.app.ui.components.formatReminderFireAt
import com.notesreminders.app.ui.components.pickNextReminder
import com.notesreminders.app.ui.components.rememberReminderScheduleState
import com.notesreminders.app.ui.theme.RecallColors
import com.notesreminders.app.ui.theme.recallFieldColors

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
        NoteDetailToolbar(
            isPinned = isPinned,
            isArchived = isArchived,
            preview = preview,
            onBack = {
                viewModel.flushNoteSave(noteId, title, body)
                onBack()
            },
            onSync = { viewModel.syncNow() },
            onTogglePin = {
                val pinned = !isPinned
                isPinned = pinned
                viewModel.setNotePinned(noteId, pinned)
            },
            onToggleArchive = {
                val archived = !isArchived
                isArchived = archived
                viewModel.setNoteArchived(noteId, archived)
            },
            onTogglePreview = { preview = !preview },
            onDelete = { showDeleteNoteDialog = true },
        )

        NoteConflictBanner(
            conflict = noteConflict,
            onKeepLocal = { noteConflict?.let { viewModel.resolveConflict(it.id, keepLocal = true) } },
            onKeepServer = { noteConflict?.let { viewModel.resolveConflict(it.id, keepLocal = false) } },
        )

        Text(
            "$saveStatus · Sync uploads to web",
            style = MaterialTheme.typography.bodySmall,
            color = RecallColors.ParchmentMuted,
            modifier = Modifier.padding(bottom = 12.dp),
        )

        NoteEditorSection(
            title = title,
            body = body,
            preview = preview,
            fieldColors = fieldColors,
            onTitleChange = {
                title = it
                hasLocalEdits = true
                saveStatus = "Unsaved…"
                viewModel.scheduleNoteSave(noteId, title, body)
            },
            onBodyChange = {
                body = it
                hasLocalEdits = true
                saveStatus = "Unsaved…"
                viewModel.scheduleNoteSave(noteId, title, body)
            },
        )

        Spacer(Modifier.height(28.dp))
        NoteTagSection(
            allTags = allTags,
            selectedTagIds = selectedTagIds,
            newTagName = newTagName,
            fieldColors = fieldColors,
            onTagNameChange = { newTagName = it },
            onAssignTag = { viewModel.assignTag(noteId, it) },
            onUnassignTag = { viewModel.unassignTag(noteId, it) },
            onCreateTag = {
                val name = newTagName.trim()
                if (name.isNotEmpty()) {
                    viewModel.createTagAndAssign(noteId, name) { newTagName = "" }
                }
            },
        )

        Spacer(Modifier.height(16.dp))
        NextNudgeCard(
            reminder = pickNextReminder(reminders),
            noteTitle = title,
        )

        Spacer(Modifier.height(28.dp))
        NoteReminderSection(
            reminders = reminders,
            fetchingReminders = fetchingReminders,
            onAddReminder = { openCreateDialog() },
            onFetchReminders = {
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
            onEditReminder = { schedule.openEdit(it) },
            onDeleteReminder = { reminderToDelete = it },
        )
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
