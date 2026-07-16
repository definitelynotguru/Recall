package com.notesreminders.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val RecallDark = darkColorScheme(
    primary = RecallColors.Accent,
    onPrimary = RecallColors.DarkBackground,
    primaryContainer = RecallColors.AccentContainerDark,
    onPrimaryContainer = RecallColors.OnAccentContainerDark,
    secondary = RecallColors.DarkText,
    onSecondary = RecallColors.DarkBackground,
    secondaryContainer = RecallColors.DarkRaised,
    onSecondaryContainer = RecallColors.DarkText,
    tertiary = RecallColors.DarkMuted,
    onTertiary = RecallColors.DarkBackground,
    background = RecallColors.DarkBackground,
    onBackground = RecallColors.DarkText,
    surface = RecallColors.DarkSurface,
    onSurface = RecallColors.DarkText,
    surfaceVariant = RecallColors.DarkRaised,
    onSurfaceVariant = RecallColors.DarkMuted,
    outline = RecallColors.DarkOutline,
    outlineVariant = RecallColors.DarkBorder,
    surfaceTint = RecallColors.Accent,
    inverseSurface = RecallColors.DarkText,
    inverseOnSurface = RecallColors.DarkBackground,
    inversePrimary = RecallColors.AccentDark,
    error = RecallColors.ErrorDark,
    onError = Color(0xFF690005),
    errorContainer = RecallColors.ErrorContainerDark,
    onErrorContainer = RecallColors.ErrorDark,
)

private val RecallLight = lightColorScheme(
    primary = RecallColors.AccentDark,
    onPrimary = RecallColors.LightSurface,
    primaryContainer = RecallColors.AccentContainerLight,
    onPrimaryContainer = RecallColors.OnAccentContainerLight,
    secondary = RecallColors.LightText,
    onSecondary = RecallColors.LightSurface,
    secondaryContainer = RecallColors.LightRaised,
    onSecondaryContainer = RecallColors.LightText,
    tertiary = RecallColors.LightMuted,
    onTertiary = RecallColors.LightSurface,
    background = RecallColors.LightBackground,
    onBackground = RecallColors.LightText,
    surface = RecallColors.LightSurface,
    onSurface = RecallColors.LightText,
    surfaceVariant = RecallColors.LightRaised,
    onSurfaceVariant = RecallColors.LightMuted,
    outline = RecallColors.LightOutline,
    outlineVariant = RecallColors.LightBorder,
    surfaceTint = RecallColors.AccentDark,
    inverseSurface = RecallColors.DarkSurface,
    inverseOnSurface = RecallColors.DarkText,
    inversePrimary = RecallColors.Accent,
    error = RecallColors.ErrorLight,
    onError = RecallColors.LightSurface,
    errorContainer = RecallColors.ErrorContainerLight,
    onErrorContainer = Color(0xFF410002),
)

private val RecallShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(20.dp),
)

@Composable
fun NotesTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    MaterialTheme(
        colorScheme = if (dark) RecallDark else RecallLight,
        typography = RecallTypography,
        shapes = RecallShapes,
        content = content,
    )
}
