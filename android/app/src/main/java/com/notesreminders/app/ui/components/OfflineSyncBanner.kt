package com.notesreminders.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.theme.RecallColors

const val OFFLINE_SYNC_MESSAGE =
    "Can't reach the network right now. Sync is paused until you're back online."

@Composable
fun OfflineSyncBanner(
    modifier: Modifier = Modifier,
    onReconnect: () -> Unit,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(RecallColors.CopperDim)
            .padding(start = 12.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            OFFLINE_SYNC_MESSAGE,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodySmall,
            color = RecallColors.Parchment,
        )
        TextButton(onClick = onReconnect) {
            Text("Reconnect", color = RecallColors.Copper)
        }
    }
}
