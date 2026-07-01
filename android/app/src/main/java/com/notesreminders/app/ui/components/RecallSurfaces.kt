package com.notesreminders.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.theme.RecallColors

val RecallShapeLg = RoundedCornerShape(12.dp)

@Composable
fun RecallPanel(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RecallShapeLg)
            .background(RecallColors.InkSurface.copy(alpha = 0.85f))
            .border(1.dp, RecallColors.BorderStrong, RecallShapeLg)
            .padding(20.dp),
        content = content,
    )
}
