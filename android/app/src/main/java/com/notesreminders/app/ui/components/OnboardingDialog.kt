package com.notesreminders.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.Templates
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.theme.RecallColors

private data class SurveyOption(val index: Int, val label: String, val hint: String)

private val SURVEY_OPTIONS = Templates.DEFAULTS.mapIndexed { i, t ->
    SurveyOption(
        index = i,
        label = when (i) {
            0 -> "Daily journaling"
            1 -> "Meeting notes"
            else -> "Project planning"
        },
        hint = t.title,
    )
}

@Composable
fun OnboardingDialog(
    open: Boolean,
    viewModel: AppViewModel,
    onDismiss: () -> Unit,
    onRequestNotifications: () -> Unit = {},
) {
    if (!open) return

    var checked by remember { mutableStateOf(booleanArrayOf(true, false, false)) }

    RecallAlertDialog(
        onDismissRequest = onDismiss,
        title = "Welcome to Recall",
        text = {
            Column {
                Text(
                    "Pick how you'll use Recall. We'll create editable starter notes you can tweak or delete.",
                    color = RecallColors.ParchmentMuted,
                )
                Spacer(Modifier.height(12.dp))
                SURVEY_OPTIONS.forEach { opt ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { checked = checked.copyOf().also { it[opt.index] = !it[opt.index] } }
                            .height(44.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(
                            checked = checked[opt.index],
                            onCheckedChange = { v ->
                                checked = checked.copyOf().also { it[opt.index] = v }
                            },
                        )
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text(opt.label, color = RecallColors.Parchment, fontWeight = FontWeight.Medium)
                            Text(opt.hint, color = RecallColors.ParchmentMuted, style = androidx.compose.material3.MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        },
        confirmButton = {
            RecallDialogConfirmButton(
                "Create starter notes",
                {
                    val indices = checked.indices.filter { checked[it] }.toList()
                    if (indices.isNotEmpty()) {
                        viewModel.createStarterNotesFromSurvey(indices) {
                            onRequestNotifications()
                            onDismiss()
                        }
                    } else {
                        onRequestNotifications()
                        onDismiss()
                    }
                },
            )
        },
        dismissButton = {
            RecallDialogTextButton("Skip", onDismiss, RecallColors.ParchmentMuted)
        },
    )
}
