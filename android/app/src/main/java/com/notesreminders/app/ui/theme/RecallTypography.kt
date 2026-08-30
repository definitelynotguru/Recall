package com.notesreminders.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.notesreminders.app.R

private val Manrope =
    FontFamily(
        Font(R.font.manrope_variable, FontWeight.Normal),
        Font(R.font.manrope_variable, FontWeight.Medium),
        Font(R.font.manrope_variable, FontWeight.SemiBold),
        Font(R.font.manrope_variable, FontWeight.Bold),
    )

private val PlexMono =
    FontFamily(
        Font(R.font.ibm_plex_mono_regular, FontWeight.Normal),
        Font(R.font.ibm_plex_mono_medium, FontWeight.Medium),
    )

private fun manrope(
    weight: FontWeight,
    size: Int,
    lineHeight: Int,
    letterSpacing: Float = 0f,
) = TextStyle(
    fontFamily = Manrope,
    fontWeight = weight,
    fontSize = size.sp,
    lineHeight = lineHeight.sp,
    letterSpacing = letterSpacing.sp,
)

val RecallTypography =
    Typography(
        displayLarge = manrope(FontWeight.SemiBold, 42, 48, -0.6f),
        displayMedium = manrope(FontWeight.SemiBold, 36, 42, -0.4f),
        displaySmall = manrope(FontWeight.SemiBold, 32, 38, -0.3f),
        headlineLarge = manrope(FontWeight.SemiBold, 30, 36, -0.2f),
        headlineMedium = manrope(FontWeight.SemiBold, 26, 32, -0.1f),
        headlineSmall = manrope(FontWeight.SemiBold, 22, 28),
        titleLarge = manrope(FontWeight.SemiBold, 20, 26),
        titleMedium = manrope(FontWeight.SemiBold, 16, 22, 0.1f),
        titleSmall = manrope(FontWeight.Medium, 14, 20, 0.1f),
        bodyLarge = manrope(FontWeight.Normal, 16, 24, 0.1f),
        bodyMedium = manrope(FontWeight.Normal, 14, 21, 0.15f),
        bodySmall = manrope(FontWeight.Normal, 12, 18, 0.2f),
        labelLarge = manrope(FontWeight.SemiBold, 14, 20, 0.1f),
        labelMedium = manrope(FontWeight.Medium, 12, 16, 0.3f),
        labelSmall =
        TextStyle(
            fontFamily = PlexMono,
            fontWeight = FontWeight.Medium,
            fontSize = 11.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.3.sp,
        ),
    )
