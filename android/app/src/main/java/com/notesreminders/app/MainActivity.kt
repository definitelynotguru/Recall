package com.notesreminders.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Note
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.notesreminders.app.sync.SyncWorker
import com.notesreminders.app.ui.AppViewModel
import com.notesreminders.app.ui.screens.LoginScreen
import com.notesreminders.app.ui.screens.NoteDetailScreen
import com.notesreminders.app.ui.screens.NotesListScreen
import com.notesreminders.app.ui.screens.TodayScreen
import com.notesreminders.app.ui.theme.RecallColors
import com.notesreminders.app.ui.theme.NotesTheme

class MainActivity : ComponentActivity() {
    private val notificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        requestNotificationPermission()

        setContent {
            NotesTheme {
                val viewModel: AppViewModel = viewModel()
                var loggedIn by remember { mutableStateOf(viewModel.isLoggedIn) }

                if (!loggedIn) {
                    LoginScreen(viewModel) { loggedIn = true }
                } else {
                    MainShell(viewModel) { loggedIn = false }
                }
            }
        }

        val app = application as NotesApp
        if (app.tokenStore.isLoggedIn()) {
            SyncWorker.runOnce(this)
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS,
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}

private data class BottomTab(
    val route: String,
    val label: String,
    val icon: ImageVector,
)

@Composable
private fun MainShell(viewModel: AppViewModel, onLogout: () -> Unit) {
    val nav = rememberNavController()
    val tabs = listOf(
        BottomTab("today", "Today", Icons.Outlined.CalendarToday),
        BottomTab("notes", "Notes", Icons.Outlined.Note),
    )
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val showBottomBar = currentRoute in tabs.map { it.route }

    Scaffold(
        containerColor = RecallColors.Ink,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = RecallColors.InkElevated,
                    contentColor = RecallColors.Parchment,
                ) {
                    tabs.forEach { tab ->
                        val selected = currentRoute == tab.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                nav.navigate(tab.route) {
                                    popUpTo(nav.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    tab.icon,
                                    contentDescription = tab.label,
                                    tint = if (selected) RecallColors.Copper else RecallColors.ParchmentMuted,
                                )
                            },
                            label = {
                                Text(
                                    tab.label,
                                    color = if (selected) RecallColors.Copper else RecallColors.ParchmentMuted,
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = RecallColors.CopperDim,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = "today",
            modifier = Modifier
                .padding(padding)
                .background(RecallColors.Ink),
        ) {
            composable("today") {
                TodayScreen(
                    viewModel = viewModel,
                    onOpenNote = { noteId -> nav.navigate("note/$noteId") },
                    onLogout = { viewModel.logout { onLogout() } },
                )
            }
            composable("notes") {
                NotesListScreen(
                    viewModel = viewModel,
                    onOpenNote = { noteId -> nav.navigate("note/$noteId") },
                    onLogout = { viewModel.logout { onLogout() } },
                )
            }
            composable("note/{id}") { entry ->
                val id = entry.arguments?.getString("id") ?: return@composable
                NoteDetailScreen(
                    noteId = id,
                    viewModel = viewModel,
                    onBack = { nav.popBackStack() },
                )
            }
        }
    }
}
