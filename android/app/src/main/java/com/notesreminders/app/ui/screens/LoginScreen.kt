package com.notesreminders.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.components.RecallPanel
import com.notesreminders.app.ui.theme.RecallColors

@Composable
fun LoginScreen(viewModel: AppViewModel, onLoggedIn: () -> Unit) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var registerSecret by rememberSaveable { mutableStateOf("") }
    var isRegister by rememberSaveable { mutableStateOf(false) }
    val error by viewModel.authError.collectAsState()

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = RecallColors.Copper,
        unfocusedBorderColor = RecallColors.BorderStrong,
        focusedTextColor = RecallColors.Parchment,
        unfocusedTextColor = RecallColors.Parchment,
        cursorColor = RecallColors.Copper,
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(RecallColors.InkElevated, RecallColors.Ink),
                ),
            )
            .verticalScroll(rememberScrollState())
            .padding(28.dp),
    ) {
        Text(
            "Recall",
            style = MaterialTheme.typography.displayLarge,
            color = RecallColors.Parchment,
        )
        Text(
            "Notes that remember",
            style = MaterialTheme.typography.bodyLarge,
            color = RecallColors.ParchmentMuted,
        )
        Spacer(Modifier.height(40.dp))

        RecallPanel {
            Text(
                if (isRegister) "Create vault" else "Welcome back",
                style = MaterialTheme.typography.headlineMedium,
                color = RecallColors.Parchment,
            )
            Spacer(Modifier.height(20.dp))

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth(),
                colors = fieldColors,
                singleLine = true,
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                modifier = Modifier.fillMaxWidth(),
                colors = fieldColors,
                singleLine = true,
            )
            if (isRegister) {
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = registerSecret,
                    onValueChange = { registerSecret = it },
                    label = { Text("Registration secret") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = fieldColors,
                    singleLine = true,
                )
            }
            error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = RecallColors.Error, style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = {
                    if (isRegister) {
                        viewModel.register(email, password, registerSecret, onLoggedIn)
                    } else {
                        viewModel.login(email, password, onLoggedIn)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = RecallColors.Copper,
                    contentColor = RecallColors.Ink,
                ),
            ) {
                Text(
                    if (isRegister) "Create account" else "Open Recall",
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }

        TextButton(onClick = { isRegister = !isRegister }) {
            Text(
                if (isRegister) "Have an account? Sign in" else "Need an account? Register",
                color = RecallColors.ParchmentMuted,
            )
        }
    }
}
