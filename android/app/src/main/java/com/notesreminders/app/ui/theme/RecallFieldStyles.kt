package com.notesreminders.app.ui.theme

import androidx.compose.material3.ButtonColors
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SwitchColors
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable

@Composable
fun recallFieldColors(): TextFieldColors = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = RecallColors.Copper,
    unfocusedBorderColor = RecallColors.BorderStrong,
    focusedTextColor = RecallColors.Parchment,
    unfocusedTextColor = RecallColors.Parchment,
    cursorColor = RecallColors.Copper,
    focusedLabelColor = RecallColors.ParchmentMuted,
    unfocusedLabelColor = RecallColors.ParchmentMuted,
)

@Composable
fun recallSwitchColors(): SwitchColors = SwitchDefaults.colors(
    checkedThumbColor = RecallColors.Ink,
    checkedTrackColor = RecallColors.Copper,
)

@Composable
fun recallPrimaryButtonColors(): ButtonColors = ButtonDefaults.buttonColors(
    containerColor = RecallColors.Copper,
    contentColor = RecallColors.Ink,
)

@Composable
fun recallSecondaryButtonColors(): ButtonColors = ButtonDefaults.buttonColors(
    containerColor = RecallColors.InkSurface,
    contentColor = RecallColors.Copper,
)

@Composable
fun recallTagFilterChipColors() = FilterChipDefaults.filterChipColors(
    selectedContainerColor = RecallColors.CopperDim,
    selectedLabelColor = RecallColors.Copper,
    containerColor = RecallColors.InkSurface,
    labelColor = RecallColors.ParchmentMuted,
)

@Composable
fun recallTimeFilterChipColors() = FilterChipDefaults.filterChipColors(
    selectedContainerColor = RecallColors.Copper,
    selectedLabelColor = RecallColors.Ink,
    containerColor = RecallColors.InkElevated,
    labelColor = RecallColors.ParchmentMuted,
)

@Composable
fun recallRepeatFilterChipColors() = FilterChipDefaults.filterChipColors(
    containerColor = RecallColors.InkElevated,
    labelColor = RecallColors.Copper,
)
