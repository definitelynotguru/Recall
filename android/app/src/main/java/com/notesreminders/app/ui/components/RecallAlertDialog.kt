package com.notesreminders.app.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

@Composable
fun RecallAlertDialog(
    onDismissRequest: () -> Unit,
    title: String,
    text: @Composable () -> Unit,
    confirmButton: @Composable () -> Unit,
    dismissButton: @Composable () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismissRequest,
        containerColor = MaterialTheme.colorScheme.surface,
        titleContentColor = MaterialTheme.colorScheme.onSurface,
        textContentColor = MaterialTheme.colorScheme.onSurfaceVariant,
        shape = MaterialTheme.shapes.extraLarge,
        title = { Text(title) },
        text = text,
        confirmButton = confirmButton,
        dismissButton = dismissButton,
    )
}

@Composable
fun RecallDialogTextButton(
    label: String,
    onClick: () -> Unit,
    color: Color,
    enabled: Boolean = true,
) {
    TextButton(onClick = onClick, enabled = enabled) {
        Text(label, color = color)
    }
}

@Composable
fun RecallDialogDestructiveButton(label: String, onClick: () -> Unit) {
    RecallDialogTextButton(label, onClick, MaterialTheme.colorScheme.error)
}

@Composable
fun RecallDialogConfirmButton(
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    RecallDialogTextButton(label, onClick, MaterialTheme.colorScheme.primary, enabled)
}
