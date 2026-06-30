package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mikepenz.markdown.m3.Markdown
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun NoteEditorSection(
    title: String,
    body: String,
    preview: Boolean,
    fieldColors: androidx.compose.material3.TextFieldColors,
    onTitleChange: (String) -> Unit,
    onBodyChange: (String) -> Unit,
) {
    RecallPanel {
        OutlinedTextField(
            value = title,
            onValueChange = onTitleChange,
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
                onValueChange = onBodyChange,
                label = { Text("Body \u2014 Markdown") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(360.dp),
                colors = fieldColors,
            )
        }
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
