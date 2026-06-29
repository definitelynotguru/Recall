package com.notesreminders.app.widget

import android.content.Context
import androidx.compose.ui.unit.dp
import androidx.glance.Color
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.Button
import androidx.glance.appwidget.ButtonColors
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.notesreminders.app.MainActivity
import com.notesreminders.app.NotesApp
import com.notesreminders.app.ui.theme.RecallColors
import java.time.Duration
import java.time.Instant

class QuickAddWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val app = context.applicationContext as NotesApp
        val reminders = app.database.reminderDao().getActive().take(WIDGET_COUNT)
        val noteDao = app.database.noteDao()
        val items = reminders.map { r ->
            val note = noteDao.getById(r.noteId)
            WidgetReminder(
                title = note?.title?.ifBlank { "Untitled" } ?: "Reminder",
                relativeTime = formatRelative(r.fireAt),
            )
        }

        provideContent {
            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .padding(12.dp)
                    .background(Color(RecallColors.Ink))
                    .cornerRadius(16.dp),
            ) {
                Text(
                    "Upcoming",
                    style = TextStyle(
                        color = Color(RecallColors.Copper),
                        fontWeight = FontWeight.Bold,
                    ),
                )
                Spacer(GlanceModifier.height(6.dp))
                if (items.isEmpty()) {
                    Text(
                        "No reminders",
                        style = TextStyle(color = Color(RecallColors.ParchmentMuted)),
                    )
                } else {
                    items.forEach { item ->
                        Column(
                            modifier = GlanceModifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                        ) {
                            Text(
                                item.title,
                                style = TextStyle(
                                    color = Color(RecallColors.Parchment),
                                    fontWeight = FontWeight.Medium,
                                ),
                            )
                            Text(
                                item.relativeTime,
                                style = TextStyle(color = Color(RecallColors.ParchmentMuted)),
                            )
                        }
                    }
                }
                Spacer(GlanceModifier.height(8.dp))
                Button(
                    text = "Quick add",
                    onClick = actionStartActivity<MainActivity>(
                        actionParametersOf(QUICK_ADD_KEY to true),
                    ),
                    colors = ButtonColors(
                        Color(RecallColors.Copper),
                        Color(RecallColors.Ink),
                    ),
                )
            }
        }
    }

    companion object {
        private const val WIDGET_COUNT = 3
        val QUICK_ADD_KEY = ActionParameters.Key<Boolean>(MainActivity.EXTRA_QUICK_ADD)

        suspend fun refreshAll(context: Context) {
            try {
                GlanceAppWidgetManager(context).updateAll()
            } catch (_: Exception) {
            }
        }

        private fun formatRelative(fireAtIso: String): String {
            return try {
                val fire = Instant.parse(fireAtIso)
                val now = Instant.now()
                val dur = Duration.between(now, fire)
                when {
                    dur.isNegative || dur.isZero -> "now"
                    dur.toHours() < 1 -> "${dur.toMinutes()}m"
                    dur.toHours() < 24 -> "${dur.toHours()}h"
                    dur.toDays() < 30 -> "${dur.toDays()}d"
                    else -> fireAtIso.take(10)
                }
            } catch (_: Exception) {
                fireAtIso.take(10)
            }
        }
    }
}

private data class WidgetReminder(
    val title: String,
    val relativeTime: String,
)

class QuickAddWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = QuickAddWidget()
}
