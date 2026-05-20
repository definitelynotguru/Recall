package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun OnboardingDialog(
    open: Boolean,
    onDismiss: () -> Unit,
) {
    if (!open) return

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = RecallColors.InkSurface,
        title = { Text("Welcome to Recall", color = RecallColors.Parchment) },
        text = {
            Column {
                Text("1. Write notes in Markdown", color = RecallColors.ParchmentMuted)
                Spacer(Modifier.height(8.dp))
                Text("2. Fetch reminders — we detect dates and smart repeats", color = RecallColors.ParchmentMuted)
                Spacer(Modifier.height(8.dp))
                Text("3. Tap Sync so your phone delivers notifications", color = RecallColors.ParchmentMuted)
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Got it", color = RecallColors.Copper)
            }
        },
    )
}
