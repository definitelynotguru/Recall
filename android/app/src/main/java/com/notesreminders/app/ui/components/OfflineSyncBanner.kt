package com.notesreminders.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.theme.RecallColors

const val OFFLINE_SYNC_MESSAGE =
    "You're out of Internet. Sync will not take action till you are back online."

@Composable
fun OfflineSyncBanner(modifier: Modifier = Modifier) {
    Text(
        OFFLINE_SYNC_MESSAGE,
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(RecallColors.CopperDim)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        style = MaterialTheme.typography.bodySmall,
        color = RecallColors.Parchment,
    )
}
