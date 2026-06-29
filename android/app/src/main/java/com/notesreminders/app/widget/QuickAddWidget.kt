package com.notesreminders.app.widget

import android.content.Context
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
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
            GlanceTheme {
                Column(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .padding(12.dp)
                        .background(GlanceTheme.colors.surface),
                ) {
                    Text(
                        "Upcoming",
                        style = TextStyle(
                            color = GlanceTheme.colors.primary,
                            fontWeight = FontWeight.Bold,
                        ),
                    )
                    Spacer(GlanceModifier.height(6.dp))
                    if (items.isEmpty()) {
                        Text(
                            "No reminders",
                            style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant),
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
                                        color = GlanceTheme.colors.onSurface,
                                        fontWeight = FontWeight.Medium,
                                    ),
                                )
                                Text(
                                    item.relativeTime,
                                    style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant),
                                )
                            }
                        }
                    }
                    Spacer(GlanceModifier.height(8.dp))
                    Text(
                        "Quick add",
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .padding(8.dp)
                            .clickable(
                                actionStartActivity<MainActivity>(
                                    actionParametersOf(QUICK_ADD_KEY to true),
                                ),
                            ),
                        style = TextStyle(
                            color = GlanceTheme.colors.primary,
                            fontWeight = FontWeight.Bold,
                        ),
                    )
                }
            }
        }
    }

    companion object {
        private const val WIDGET_COUNT = 3
        val QUICK_ADD_KEY = ActionParameters.Key<Boolean>(MainActivity.EXTRA_QUICK_ADD)

        suspend fun refreshAll(context: Context) {
            try {
                QuickAddWidget().updateAll(context)
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
