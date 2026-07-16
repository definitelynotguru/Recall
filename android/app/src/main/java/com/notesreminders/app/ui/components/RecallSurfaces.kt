package com.notesreminders.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

enum class RecallPanelStyle {
    Grouped,
    Raised,
    Accent,
}

@Composable
fun RecallPanel(
    modifier: Modifier = Modifier,
    style: RecallPanelStyle = RecallPanelStyle.Grouped,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = MaterialTheme.colorScheme
    val containerColor = when (style) {
        RecallPanelStyle.Grouped -> colors.surface
        RecallPanelStyle.Raised -> colors.surfaceVariant
        RecallPanelStyle.Accent -> colors.primaryContainer
    }
    val contentColor = when (style) {
        RecallPanelStyle.Accent -> colors.onPrimaryContainer
        else -> colors.onSurface
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = containerColor,
        contentColor = contentColor,
        tonalElevation = if (style == RecallPanelStyle.Raised) 1.dp else 0.dp,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp),
            content = content,
        )
    }
}
