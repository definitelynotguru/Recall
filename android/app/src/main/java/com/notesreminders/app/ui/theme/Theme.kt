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
    primary = RecallColors.Copper,
    onPrimary = Color(0xFF020202),
    background = Color(0xFFFAFAFA),
    onBackground = Color(0xFF020202),
    surface = Color(0xFFF6F1E7),
    onSurface = Color(0xFF020202),
    surfaceVariant = Color(0xFFD6D3D2),
    onSurfaceVariant = Color(0xFF5C5855),
    outline = Color(0xFFB8B3B0),
    error = RecallColors.Error,
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
