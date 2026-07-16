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
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Note
import androidx.compose.material.icons.outlined.Settings
import com.notesreminders.app.ui.components.OnboardingDialog
import com.notesreminders.app.ui.screens.HistoryScreen
import com.notesreminders.app.ui.screens.SettingsScreen
import com.notesreminders.app.ui.screens.CalendarScreen
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
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
import androidx.compose.ui.platform.LocalConfiguration
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
import com.notesreminders.app.ui.theme.NotesTheme

class MainActivity : ComponentActivity() {
    private val notificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }

    private val pendingNoteId = mutableStateOf<String?>(null)
    private val pendingSharedText = mutableStateOf<SharedPayload?>(null)
    private val pendingQuickAdd = mutableStateOf(false)

    companion object {
        const val EXTRA_QUICK_ADD = "quick_add"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        pendingNoteId.value = intent.getStringExtra(ReminderReceiver.EXTRA_NOTE_ID)
        pendingSharedText.value = intent.extractSharedText()
        pendingQuickAdd.value = intent.getBooleanExtra(EXTRA_QUICK_ADD, false)

        setContent {
            NotesTheme {
                val viewModel: AppViewModel = viewModel()
                var loggedIn by remember { mutableStateOf(viewModel.isLoggedIn) }
                val launchNoteId = pendingNoteId.value
                val launchSharedText = pendingSharedText.value
                val launchQuickAdd = pendingQuickAdd.value

                if (!loggedIn) {
                    LoginScreen(viewModel) { loggedIn = true }
                } else {
                    LaunchedEffect(Unit) {
                        viewModel.reconcileAlarms()
                        if (!viewModel.userPrefs.templatesSeeded) {
                            viewModel.seedDefaultTemplates { count ->
                                if (count > 0) viewModel.syncNow(showSuccess = false)
                            }
                            viewModel.userPrefs.templatesSeeded = true
                        }
                    }
                    MainShell(
                        viewModel = viewModel,
                        launchNoteId = launchNoteId,
                        launchSharedText = launchSharedText,
                        launchQuickAdd = launchQuickAdd,
                        onNoteOpened = { pendingNoteId.value = null },
                        onSharedTextConsumed = { pendingSharedText.value = null },
                        onQuickAddConsumed = { pendingQuickAdd.value = false },
                        onRequestExactAlarms = {
                            if (ReminderPermissions.needsExactAlarmPermission(this@MainActivity)) {
                                startActivity(ReminderPermissions.exactAlarmSettingsIntent(this@MainActivity))
                            }
                        },
                        onRequestNotifications = { requestNotificationPermission() },
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
        pendingQuickAdd.value = intent.getBooleanExtra(EXTRA_QUICK_ADD, false)
    }

    private fun Intent.extractSharedText(): SharedPayload? {
        if (action != Intent.ACTION_SEND || type?.startsWith("text/") != true) return null
        val text = getStringExtra(Intent.EXTRA_TEXT)?.takeIf { it.isNotBlank() } ?: return null
        val title = getStringExtra(Intent.EXTRA_TITLE)?.takeIf { it.isNotBlank() }
        return SharedPayload(text, title)
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

private data class SharedPayload(val text: String, val title: String?)

@Composable
private fun MainShell(
    viewModel: AppViewModel,
    launchNoteId: String?,
    launchSharedText: SharedPayload?,
    launchQuickAdd: Boolean,
    onNoteOpened: () -> Unit,
    onSharedTextConsumed: () -> Unit,
    onQuickAddConsumed: () -> Unit,
    onRequestExactAlarms: () -> Unit,
    onRequestNotifications: () -> Unit,
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
        if (launchSharedText != null) {
            viewModel.createNoteFromText(launchSharedText.text, launchSharedText.title) { noteId ->
                nav.navigate("note/$noteId") { launchSingleTop = true }
                onSharedTextConsumed()
            }
        }
    }
    LaunchedEffect(launchQuickAdd) {
        if (launchQuickAdd) {
            viewModel.createNote { noteId ->
                nav.navigate("note/$noteId") { launchSingleTop = true }
                onQuickAddConsumed()
            }
        }
    }
    val tabs = listOf(
        BottomTab("today", "Today", Icons.Outlined.CalendarToday),
        BottomTab("notes", "Notes", Icons.Outlined.Note),
        BottomTab("calendar", "Calendar", Icons.Outlined.CalendarMonth),
        BottomTab("history", "History", Icons.Outlined.History),
        BottomTab("settings", "Settings", Icons.Outlined.Settings),
    )
    var showOnboarding by remember { mutableStateOf(!viewModel.userPrefs.onboardingDone) }
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val showBottomBar = tabs.any { it.route == currentRoute }
    val useNavigationRail = LocalConfiguration.current.screenWidthDp >= 600

    fun navigateToTab(route: String) {
        nav.navigate(route) {
            popUpTo(nav.graph.findStartDestination().id) {
                saveState = true
            }
            launchSingleTop = true
            restoreState = true
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            if (showBottomBar && !useNavigationRail) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.onSurface,
                ) {
                    tabs.forEach { tab ->
                        val selected = currentRoute == tab.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = { navigateToTab(tab.route) },
                            icon = {
                                Icon(
                                    tab.icon,
                                    contentDescription = tab.label,
                                )
                            },
                            label = { Text(tab.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        Row(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize(),
        ) {
            if (showBottomBar && useNavigationRail) {
                NavigationRail(containerColor = MaterialTheme.colorScheme.surface) {
                    tabs.forEach { tab ->
                        NavigationRailItem(
                            selected = currentRoute == tab.route,
                            onClick = { navigateToTab(tab.route) },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
            Column(Modifier.weight(1f)) {
                if (!isOnline) {
                    OfflineSyncBanner(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        onReconnect = {
                            viewModel.refreshConnectivity()
                            viewModel.syncNow()
                        },
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
                            onOpenCalendar = { nav.navigate("calendar") { launchSingleTop = true } },
                        )
                    }
                    composable("notes") {
                        NotesListScreen(
                            viewModel = viewModel,
                            onOpenNote = { noteId -> nav.navigate("note/$noteId") },
                            onLogout = { viewModel.logout { onLogout() } },
                        )
                    }
                    composable("calendar") {
                        CalendarScreen(
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
                            onOpenNote = { id ->
                                nav.navigate("note/$id") { launchSingleTop = true }
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
                            onOpenNote = { newId ->
                                nav.navigate("note/$newId") { launchSingleTop = true }
                            },
                            onRequestExactAlarms = onRequestExactAlarms,
                        )
                    }
                }
            }
        }
    }

    OnboardingDialog(
        open = showOnboarding,
        viewModel = viewModel,
        onDismiss = {
            viewModel.userPrefs.onboardingDone = true
            showOnboarding = false
        },
        onRequestNotifications = onRequestNotifications,
    )
}
