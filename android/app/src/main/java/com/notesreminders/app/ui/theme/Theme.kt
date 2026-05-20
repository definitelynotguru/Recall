package com.notesreminders.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val RecallDark = darkColorScheme(
    primary = RecallColors.Copper,
    onPrimary = RecallColors.Ink,
    background = RecallColors.Ink,
    onBackground = RecallColors.Parchment,
    surface = RecallColors.InkElevated,
    onSurface = RecallColors.Parchment,
    surfaceVariant = RecallColors.InkSurface,
    onSurfaceVariant = RecallColors.ParchmentMuted,
    outline = RecallColors.BorderStrong,
    error = RecallColors.Error,
)

private val RecallLight = lightColorScheme(
    primary = Color(0xFFA86542),
    onPrimary = Color.White,
    background = Color(0xFFF4F1EB),
    onBackground = Color(0xFF1A1814),
    surface = Color.White,
    onSurface = Color(0xFF1A1814),
    surfaceVariant = Color(0xFFEDE8E0),
    onSurfaceVariant = Color(0xFF6B6560),
    outline = Color(0x1A1A1814),
)

@Composable
fun NotesTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    MaterialTheme(
        colorScheme = if (dark) RecallDark else RecallLight,
        typography = RecallTypography,
        content = content,
    )
}
