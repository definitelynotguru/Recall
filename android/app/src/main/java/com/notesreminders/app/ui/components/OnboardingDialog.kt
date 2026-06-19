package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun OnboardingDialog(
    open: Boolean,
    onDismiss: () -> Unit,
    onRequestNotifications: () -> Unit = {},
) {
    if (!open) return

    RecallAlertDialog(
        onDismissRequest = onDismiss,
        title = "Welcome to Recall",
        text = {
            Column {
                Text("1. Write notes in Markdown", color = RecallColors.ParchmentMuted)
                Spacer(Modifier.height(8.dp))
                Text("2. Fetch reminders — we detect dates and smart repeats", color = RecallColors.ParchmentMuted)
                Spacer(Modifier.height(8.dp))
                Text("3. Tap Sync so your phone delivers notifications", color = RecallColors.ParchmentMuted)
                Spacer(Modifier.height(8.dp))
                Text(
                    "4. Allow notifications and exact alarms when prompted — otherwise reminders stay silent",
                    color = RecallColors.ParchmentMuted,
                )
            }
        },
        confirmButton = {
            RecallDialogConfirmButton("Got it", {
                onRequestNotifications()
                onDismiss()
            })
        },
        dismissButton = null,
    )
}
