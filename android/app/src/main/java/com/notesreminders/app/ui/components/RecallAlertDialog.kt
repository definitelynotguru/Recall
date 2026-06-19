package com.notesreminders.app.ui.components

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun RecallAlertDialog(
    onDismissRequest: () -> Unit,
    title: String,
    text: (@Composable () -> Unit)? = null,
    confirmButton: (@Composable () -> Unit)? = null,
    dismissButton: (@Composable () -> Unit)? = {
        RecallDialogTextButton("Cancel", onDismissRequest, RecallColors.ParchmentMuted)
    },
) {
    AlertDialog(
        onDismissRequest = onDismissRequest,
        containerColor = RecallColors.InkSurface,
        title = { Text(title, color = RecallColors.Parchment) },
        text = text,
        confirmButton = confirmButton ?: {},
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
    RecallDialogTextButton(label, onClick, RecallColors.Error)
}

@Composable
fun RecallDialogConfirmButton(
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    RecallDialogTextButton(label, onClick, RecallColors.Copper, enabled)
}
