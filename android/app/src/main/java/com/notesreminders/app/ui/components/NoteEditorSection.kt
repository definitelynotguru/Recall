package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mikepenz.markdown.m3.Markdown

@Composable
fun NoteEditorSection(
    title: String,
    body: String,
    preview: Boolean,
    fieldColors: TextFieldColors,
    onTitleChange: (String) -> Unit,
    onBodyChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = title,
        onValueChange = onTitleChange,
        label = { Text("Title") },
        placeholder = { Text("Untitled note") },
        modifier = Modifier.fillMaxWidth(),
        colors = fieldColors,
        textStyle = MaterialTheme.typography.headlineMedium.copy(
            color = MaterialTheme.colorScheme.onSurface,
        ),
        singleLine = true,
    )
    Spacer(Modifier.height(12.dp))
    if (preview) {
        RecallPanel(style = RecallPanelStyle.Raised) {
            MarkdownPreview(body)
        }
    } else {
        OutlinedTextField(
            value = body,
            onValueChange = onBodyChange,
            label = { Text("Body — Markdown") },
            placeholder = { Text("Start writing…") },
            modifier = Modifier
                .fillMaxWidth()
                .height(420.dp),
            colors = fieldColors,
            textStyle = MaterialTheme.typography.bodyLarge,
        )
    }
}

@Composable
private fun MarkdownPreview(markdown: String) {
    val rendered = markdown.ifBlank { "_Empty_" }
    Markdown(
        content = rendered,
        modifier = Modifier.fillMaxWidth(),
    )
}
