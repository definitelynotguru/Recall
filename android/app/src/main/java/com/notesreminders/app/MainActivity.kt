package com.notesreminders.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Note
import androidx.compose.material.icons.outlined.Settings
import com.notesreminders.app.ui.components.OnboardingDialog
import com.notesreminders.app.ui.screens.HistoryScreen
import com.notesreminders.app.ui.screens.SettingsScreen
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.notesreminders.app.reminders.ReminderPermissions
import com.notesreminders.app.reminders.ReminderReceiver
import androidx.compose.ui.unit.dp
import com.notesreminders.app.ui.components.OfflineSyncBanner
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

    private val pendingNoteId = mutableStateOf<String?>(null)
    private val pendingSharedText = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        requestNotificationPermission()
        pendingNoteId.value = intent.getStringExtra(ReminderReceiver.EXTRA_NOTE_ID)
        pendingSharedText.value = intent.extractSharedText()

        setContent {
            NotesTheme {
                val viewModel: AppViewModel = viewModel()
                var loggedIn by remember { mutableStateOf(viewModel.isLoggedIn) }
                val launchNoteId = pendingNoteId.value
                val launchSharedText = pendingSharedText.value

                if (!loggedIn) {
                    LoginScreen(viewModel) { loggedIn = true }
                } else {
                    LaunchedEffect(Unit) {
                        viewModel.reconcileAlarms()
                    }
                    MainShell(
                        viewModel = viewModel,
                        launchNoteId = launchNoteId,
                        launchSharedText = launchSharedText,
                        onNoteOpened = { pendingNoteId.value = null },
                        onSharedTextConsumed = { pendingSharedText.value = null },
                        onRequestExactAlarms = {
                            if (ReminderPermissions.needsExactAlarmPermission(this@MainActivity)) {
                                startActivity(ReminderPermissions.exactAlarmSettingsIntent(this@MainActivity))
                            }
                        },
                    ) { loggedIn = false }
                }
            }
        }

        val app = application as NotesApp
        if (app.tokenStore.isLoggedIn() && app.networkMonitor.currentIsOnline()) {
            SyncWorker.runOnce(this)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingNoteId.value = intent.getStringExtra(ReminderReceiver.EXTRA_NOTE_ID)
        pendingSharedText.value = intent.extractSharedText()
    }

    private fun Intent.extractSharedText(): String? {
        if (action != Intent.ACTION_SEND || type?.startsWith("text/") != true) return null
        return getStringExtra(Intent.EXTRA_TEXT)?.takeIf { it.isNotBlank() }
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
private fun MainShell(
    viewModel: AppViewModel,
    launchNoteId: String?,
    launchSharedText: String?,
    onNoteOpened: () -> Unit,
    onSharedTextConsumed: () -> Unit,
    onRequestExactAlarms: () -> Unit,
    onLogout: () -> Unit,
) {
    val isOnline by viewModel.isOnline.collectAsState()
    val nav = rememberNavController()
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.refreshConnectivity()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(launchNoteId) {
        if (!launchNoteId.isNullOrBlank()) {
            nav.navigate("note/$launchNoteId") { launchSingleTop = true }
            onNoteOpened()
        }
    }
    LaunchedEffect(launchSharedText) {
        if (!launchSharedText.isNullOrBlank()) {
            viewModel.createNoteFromText(launchSharedText) { noteId ->
                nav.navigate("note/$noteId") { launchSingleTop = true }
                onSharedTextConsumed()
            }
        }
    }
    val tabs = listOf(
        BottomTab("today", "Today", Icons.Outlined.CalendarToday),
        BottomTab("notes", "Notes", Icons.Outlined.Note),
        BottomTab("history", "History", Icons.Outlined.History),
        BottomTab("settings", "Settings", Icons.Outlined.Settings),
    )
    var showOnboarding by remember { mutableStateOf(!viewModel.userPrefs.onboardingDone) }
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
        Column(
            modifier = Modifier
                .padding(padding)
                .background(RecallColors.Ink),
        ) {
            if (!isOnline) {
                OfflineSyncBanner(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    onReconnect = { viewModel.refreshConnectivity() },
                )
            }
            NavHost(
                navController = nav,
                startDestination = "today",
                modifier = Modifier.weight(1f),
            ) {
            composable("today") {
                TodayScreen(
                    viewModel = viewModel,
                    onOpenNote = { noteId -> nav.navigate("note/$noteId") },
                    onRequestExactAlarms = onRequestExactAlarms,
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
            composable("history") {
                HistoryScreen(
                    viewModel = viewModel,
                    onOpenNote = { noteId -> nav.navigate("note/$noteId") },
                    onLogout = { viewModel.logout { onLogout() } },
                )
            }
            composable("settings") {
                SettingsScreen(
                    viewModel = viewModel,
                    onLogout = { viewModel.logout { onLogout() } },
                    onReplayOnboarding = {
                        viewModel.userPrefs.onboardingDone = false
                        showOnboarding = true
                    },
                )
            }
            composable("note/{id}") { entry ->
                val id = entry.arguments?.getString("id") ?: return@composable
                NoteDetailScreen(
                    noteId = id,
                    viewModel = viewModel,
                    onBack = { nav.popBackStack() },
                    onDeleted = { nav.popBackStack() },
                    onRequestExactAlarms = onRequestExactAlarms,
                )
            }
            }
        }
    }

    OnboardingDialog(
        open = showOnboarding,
        onDismiss = {
            viewModel.userPrefs.onboardingDone = true
            showOnboarding = false
        },
    )
}
