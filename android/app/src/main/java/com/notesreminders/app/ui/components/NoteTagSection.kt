package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.notesreminders.app.data.local.TagEntity
import com.notesreminders.app.ui.theme.RecallColors
import com.notesreminders.app.ui.theme.recallSecondaryButtonColors
import com.notesreminders.app.ui.theme.recallTagFilterChipColors

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun NoteTagSection(
    allTags: List<TagEntity>,
    selectedTagIds: Set<String>,
    newTagName: String,
    fieldColors: androidx.compose.material3.TextFieldColors,
    onTagNameChange: (String) -> Unit,
    onAssignTag: (String) -> Unit,
    onUnassignTag: (String) -> Unit,
    onCreateTag: () -> Unit,
) {
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
                            if (selected) onUnassignTag(tag.id) else onAssignTag(tag.id)
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
                onValueChange = onTagNameChange,
                label = { Text("New tag") },
                modifier = Modifier.weight(1f),
                colors = fieldColors,
                singleLine = true,
            )
            Button(
                onClick = onCreateTag,
                colors = recallSecondaryButtonColors(),
            ) {
                Text("Add tag")
            }
        }
    }
}
