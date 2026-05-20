package com.notesreminders.app.ui.screens

import android.widget.TextView
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Notifications
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.notesreminders.app.data.local.ReminderEntity
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
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var preview by remember { mutableStateOf(false) }
    var reminders by remember { mutableStateOf<List<ReminderEntity>>(emptyList()) }
    var showReminderDialog by remember { mutableStateOf(false) }
    var reminderDate by remember { mutableStateOf(LocalDate.now().toString()) }
    var reminderTime by remember { mutableStateOf("09:00") }
    var repeatRule by remember { mutableStateOf("") }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = RecallColors.Copper,
        unfocusedBorderColor = RecallColors.BorderStrong,
        focusedTextColor = RecallColors.Parchment,
        unfocusedTextColor = RecallColors.Parchment,
    )

    LaunchedEffect(noteId) {
        val note = viewModel.getNote(noteId)
        if (note != null) {
            title = note.title
            body = note.body
        }
        reminders = viewModel.getReminders(noteId)
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Row(Modifier.fillMaxWidth()) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = RecallColors.Parchment,
                )
            }
            Spacer(Modifier.weight(1f))
            TextButton(onClick = { preview = !preview }) {
                Text(if (preview) "Edit" else "Preview", color = RecallColors.Copper)
            }
            TextButton(onClick = {
                viewModel.updateNote(noteId, title, body)
                onBack()
            }) {
                Text("Save", color = RecallColors.Copper)
            }
        }

        RecallPanel {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth(),
                colors = fieldColors,
                textStyle = MaterialTheme.typography.headlineMedium.copy(
                    color = RecallColors.Parchment,
                ),
            )
            Spacer(Modifier.height(16.dp))
            if (preview) {
                MarkdownPreview(body)
            } else {
                OutlinedTextField(
                    value = body,
                    onValueChange = { body = it },
                    label = { Text("Body — Markdown") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
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
                "Notifications fire on this device after sync.",
                style = MaterialTheme.typography.bodySmall,
                color = RecallColors.ParchmentMuted,
            )
        }
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = { showReminderDialog = true },
            colors = ButtonDefaults.buttonColors(
                containerColor = RecallColors.Copper,
                contentColor = RecallColors.Ink,
            ),
        ) {
            Text("Add reminder")
        }

        reminders.filter { it.status == "active" }.forEach { r ->
            Spacer(Modifier.height(10.dp))
            RecallPanel {
                Text(
                    formatFireAt(r.fireAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = RecallColors.ParchmentMuted,
                )
            }
        }
    }

    if (showReminderDialog) {
        AlertDialog(
            onDismissRequest = { showReminderDialog = false },
            containerColor = RecallColors.InkSurface,
            title = {
                Text("Schedule nudge", color = RecallColors.Parchment)
            },
            text = {
                Column {
                    OutlinedTextField(
                        value = reminderDate,
                        onValueChange = { reminderDate = it },
                        label = { Text("Date (YYYY-MM-DD)") },
                        colors = fieldColors,
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = reminderTime,
                        onValueChange = { reminderTime = it },
                        label = { Text("Time (HH:mm)") },
                        colors = fieldColors,
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = repeatRule,
                        onValueChange = { repeatRule = it },
                        label = { Text("Repeat or empty") },
                        colors = fieldColors,
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val zone = ZoneId.systemDefault()
                        val local = LocalDate.parse(reminderDate)
                            .atTime(LocalTime.parse(reminderTime))
                            .atZone(zone)
                        showReminderDialog = false
                        viewModel.addReminder(
                            noteId,
                            local.toInstant().toString(),
                            zone.id,
                            repeatRule.ifBlank { null },
                        ) {
                            reminders = viewModel.getReminders(noteId)
                        }
                    },
                ) {
                    Text("Save", color = RecallColors.Copper)
                }
            },
            dismissButton = {
                TextButton(onClick = { showReminderDialog = false }) {
                    Text("Cancel", color = RecallColors.ParchmentMuted)
                }
            },
        )
    }
}

@Composable
private fun MarkdownPreview(markdown: String) {
    val context = LocalContext.current
    val markwon = remember { Markwon.create(context) }
    AndroidView(
        factory = { ctx -> TextView(ctx).apply { setTextColor(0xFFE8E4DC.toInt()) } },
        update = { tv -> markwon.setMarkdown(tv, markdown.ifBlank { "_Empty_" }) },
        modifier = Modifier.fillMaxWidth(),
    )
}

private fun formatFireAt(iso: String): String {
    val formatter = DateTimeFormatter.ofPattern("EEE, MMM d · h:mm a")
    return Instant.parse(iso).atZone(ZoneId.systemDefault()).format(formatter)
}
