package com.notesreminders.app.ui

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.notesreminders.app.NotesApp
import com.notesreminders.app.data.UserPrefs
import com.notesreminders.app.data.api.LoginRequest
import com.notesreminders.app.data.api.RefreshRequest
import com.notesreminders.app.data.api.RegisterRequest
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.data.api.ApiErrorParser
import android.app.Activity
import com.notesreminders.app.BuildConfig
import com.notesreminders.app.debug.DebugReportCollector
import com.notesreminders.app.update.AppUpdater
import com.notesreminders.app.reminders.DetectedReminder
import com.notesreminders.app.sync.SyncDiagnostics
import com.notesreminders.app.sync.SyncWorker
import com.notesreminders.app.ui.components.OFFLINE_SYNC_MESSAGE
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalCoroutinesApi::class)
class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as NotesApp

    val isLoggedIn: Boolean
        get() = app.tokenStore.isLoggedIn()

    val userEmail: String?
        get() = app.tokenStore.userEmail

    private val _noteStatus = MutableStateFlow("active")
    val noteStatus: StateFlow<String> = _noteStatus.asStateFlow()

    private val _noteQuery = MutableStateFlow("")
    val noteQuery: StateFlow<String> = _noteQuery.asStateFlow()

    val notes = _noteStatus.flatMapLatest { status ->
        _noteQuery.flatMapLatest { query ->
            app.notesRepository.observeNotes(status, query)
        }
    }.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        emptyList(),
    )

    val reminders = app.notesRepository.observeReminders().stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        emptyList(),
    )

    val conflicts = app.notesRepository.observeConflicts().stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        emptyList(),
    )

    val hasPendingSync = app.notesRepository.observeHasPendingSync().stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        false,
    )

    val isOnline = app.networkMonitor.isOnline.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        app.networkMonitor.currentIsOnline(),
    )

    val userPrefs: UserPrefs = app.userPrefs

    private val _authError = MutableStateFlow<String?>(null)
    val authError: StateFlow<String?> = _authError.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _syncHint = MutableStateFlow<String?>(null)
    val syncHint: StateFlow<String?> = _syncHint.asStateFlow()

    private var noteSaveJob: Job? = null

    fun login(email: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authError.value = null
            try {
                val res = withContext(Dispatchers.IO) {
                    app.api.login(LoginRequest(email, password))
                }
                completeAuth(res.access_token, res.refresh_token, res.user.id, res.user.email)
                onSuccess()
            } catch (e: Exception) {
                _authError.value = e.message ?: "Login failed"
            }
        }
    }

    fun register(email: String, password: String, secret: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authError.value = null
            try {
                val res = withContext(Dispatchers.IO) {
                    app.api.register(RegisterRequest(email, password, secret))
                }
                completeAuth(res.access_token, res.refresh_token, res.user.id, res.user.email)
                onSuccess()
            } catch (e: Exception) {
                _authError.value = e.message ?: "Registration failed"
            }
        }
    }

    private suspend fun completeAuth(
        accessToken: String,
        refreshToken: String,
        userId: String,
        email: String,
    ) {
        app.tokenStore.accessToken = accessToken
        app.tokenStore.refreshToken = refreshToken
        app.tokenStore.userId = userId
        app.tokenStore.userEmail = email
        SyncWorker.schedule(getApplication())
        withContext(Dispatchers.IO) {
            app.notesRepository.prepareForUser(userId)
        }
        syncNow(showSuccess = true)
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            app.tokenStore.refreshToken?.let { token ->
                try {
                    withContext(Dispatchers.IO) {
                        app.api.logout(RefreshRequest(token))
                    }
                } catch (_: Exception) {
                }
            }
            noteSaveJob?.cancel()
            withContext(Dispatchers.IO) {
                app.notesRepository.clearLocalData()
            }
            app.tokenStore.clear()
            _syncHint.value = null
            onDone()
        }
    }

    fun refreshConnectivity() {
        app.networkMonitor.refresh()
        if (app.networkMonitor.currentIsOnline()) {
            if (_syncHint.value == OFFLINE_SYNC_MESSAGE) {
                _syncHint.value = null
            }
            reconcileAlarms()
        }
    }

    fun syncNow(showSuccess: Boolean = true) {
        if (_isSyncing.value) return
        app.networkMonitor.refresh()
        if (!app.networkMonitor.currentIsOnline()) {
            _syncHint.value = OFFLINE_SYNC_MESSAGE
            return
        }
        viewModelScope.launch {
            noteSaveJob?.let { job ->
                job.cancel()
                job.join()
            }
            if (!app.networkMonitor.currentIsOnline()) {
                _syncHint.value = OFFLINE_SYNC_MESSAGE
                return@launch
            }
            _isSyncing.value = true
            _syncHint.value = "Syncing…"
            val result = withContext(Dispatchers.IO) {
                app.notesRepository.syncNow()
            }
            _isSyncing.value = false
            _syncHint.value = result.fold(
                onSuccess = {
                    if (showSuccess) {
                        val time = ZonedDateTime.now(ZoneId.systemDefault())
                            .format(DateTimeFormatter.ofPattern("h:mm a"))
                        "Synced at $time · pulls notes from web"
                    } else {
                        null
                    }
                },
                onFailure = { err ->
                    val msg = ApiErrorParser.syncFailureMessage(err)
                    val skipped = SyncDiagnostics.lastWarnings.size
                    if (skipped > 0) {
                        "$msg · Skipped $skipped invalid local item(s) — Settings → Send debug report"
                    } else {
                        msg
                    }
                },
            )
        }
    }

    fun downloadAndInstallUpdate(activity: Activity, onStatus: (String) -> Unit) {
        app.networkMonitor.refresh()
        if (!app.networkMonitor.currentIsOnline()) {
            onStatus("Need internet to download update · tap Reconnect on the banner if you are online")
            return
        }
        viewModelScope.launch {
            onStatus("Downloading update…")
            if (!AppUpdater.canInstallPackages(activity)) {
                onStatus("Allow installs from this app, then tap Update again")
                AppUpdater.openInstallPermissionSettings(activity)
                return@launch
            }
            val result = withContext(Dispatchers.IO) {
                AppUpdater.downloadLatestApk(activity)
            }
            result.fold(
                onSuccess = { apk ->
                    onStatus("Opening installer…")
                    AppUpdater.promptInstall(activity, apk)
                    onStatus("Follow prompts to install · v${BuildConfig.VERSION_NAME} installed until you update")
                },
                onFailure = {
                    onStatus("Update failed: ${it.message ?: "unknown error"}")
                },
            )
        }
    }

    fun sendDebugReport(onResult: (String) -> Unit) {
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    app.networkMonitor.refresh()
                    app.notesRepository.reconcileAlarms()
                    val payload = DebugReportCollector.collect(
                        app,
                        lastSyncHint = _syncHint.value,
                    )
                    app.api.submitDebugReport(payload)
                }
            }
            onResult(
                result.fold(
                    onSuccess = { "Report sent · id ${it.id.take(8)}…" },
                    onFailure = {
                        "Failed to send report: ${it.message ?: "unknown error"}"
                    },
                ),
            )
        }
    }

    fun scheduleNoteSave(noteId: String, title: String, body: String) {
        noteSaveJob?.cancel()
        noteSaveJob = viewModelScope.launch(Dispatchers.IO) {
            delay(500)
            app.notesRepository.saveNoteLocal(noteId, title, body)
        }
    }

    fun flushNoteSave(noteId: String, title: String, body: String) {
        noteSaveJob?.cancel()
        viewModelScope.launch(Dispatchers.IO) {
            app.notesRepository.saveNoteLocal(noteId, title, body)
        }
    }

    fun createNote(onCreated: (String) -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            val note = app.notesRepository.createNote("Untitled", "")
            withContext(Dispatchers.Main) {
                onCreated(note.id)
            }
        }
    }

    fun createNoteFromText(text: String, onCreated: (String) -> Unit) {
        if (text.isBlank()) return
        viewModelScope.launch(Dispatchers.IO) {
            val note = app.notesRepository.createNoteFromText(text)
            withContext(Dispatchers.Main) {
                onCreated(note.id)
            }
        }
    }

    fun exportBackup(uri: Uri, onResult: (String) -> Unit) {
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val json = app.notesRepository.exportBackupJson()
                    getApplication<Application>().contentResolver.openOutputStream(uri)?.use { stream ->
                        stream.write(json.toByteArray(Charsets.UTF_8))
                    } ?: error("Could not open backup file")
                    "Backup exported"
                }
            }
            onResult(result.getOrElse { "Backup failed: ${it.message ?: "unknown error"}" })
        }
    }

    fun importBackup(uri: Uri, onResult: (String) -> Unit) {
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val json = getApplication<Application>().contentResolver.openInputStream(uri)?.use { stream ->
                        stream.bufferedReader(Charsets.UTF_8).readText()
                    } ?: error("Could not open backup file")
                    val bundle = app.notesRepository.importBackupJson(json)
                    val noteCount = bundle.notes.orEmpty().size
                    val reminderCount = bundle.reminders_by_note.orEmpty().values.sumOf { it.size }
                    "Imported $noteCount notes, $reminderCount reminders"
                }
            }
            onResult(result.getOrElse { "Import failed: ${it.message ?: "unknown error"}" })
        }
    }

    fun setNoteListFilter(status: String, query: String) {
        _noteStatus.value = status
        _noteQuery.value = query
    }

    fun setNotePinned(id: String, pinned: Boolean) {
        viewModelScope.launch(Dispatchers.IO) {
            app.notesRepository.setNotePinned(id, pinned)
        }
    }

    fun setNoteArchived(id: String, archived: Boolean) {
        viewModelScope.launch(Dispatchers.IO) {
            app.notesRepository.setNoteArchived(id, archived)
        }
    }

    fun resolveConflict(conflictId: String, keepLocal: Boolean) {
        viewModelScope.launch(Dispatchers.IO) {
            app.notesRepository.resolveConflict(conflictId, keepLocal)
        }
    }

    fun deleteNote(id: String, onDone: () -> Unit) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                app.notesRepository.deleteNote(id)
            }
            onDone()
        }
    }

    fun reconcileAlarms() {
        viewModelScope.launch(Dispatchers.IO) {
            app.notesRepository.reconcileAlarms()
        }
    }

    suspend fun getNote(id: String): NoteEntity? = withContext(Dispatchers.IO) {
        app.notesRepository.getNote(id)
    }

    suspend fun getReminders(noteId: String): List<ReminderEntity> = withContext(Dispatchers.IO) {
        app.notesRepository.getRemindersForNote(noteId)
    }

    fun addRemindersFromDetection(
        noteId: String,
        picks: List<DetectedReminder>,
        onComplete: () -> Unit = {},
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            val zone = ZoneId.systemDefault().id
            for (pick in picks) {
                app.notesRepository.addReminder(noteId, pick.fireAt, zone, pick.repeatRule)
            }
            if (userPrefs.autoSyncAfterReminder) {
                withContext(Dispatchers.Main) { syncNow(showSuccess = true) }
            }
            withContext(Dispatchers.Main) { onComplete() }
        }
    }

    fun addReminder(
        noteId: String,
        fireAtIso: String,
        timezone: String,
        repeatRule: String?,
        autoSync: Boolean = true,
        onDone: (suspend () -> Unit)? = null,
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            app.notesRepository.addReminder(noteId, fireAtIso, timezone, repeatRule)
            onDone?.invoke()
            if (autoSync && userPrefs.autoSyncAfterReminder) {
                withContext(Dispatchers.Main) { syncNow(showSuccess = true) }
            }
        }
    }

    fun updateReminder(
        reminderId: String,
        fireAtIso: String,
        timezone: String,
        repeatRule: String?,
        autoSync: Boolean = true,
        onDone: (suspend () -> Unit)? = null,
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            app.notesRepository.updateReminder(reminderId, fireAtIso, timezone, repeatRule)
            onDone?.invoke()
            if (autoSync && userPrefs.autoSyncAfterReminder) {
                withContext(Dispatchers.Main) { syncNow(showSuccess = true) }
            }
        }
    }

    fun deleteReminder(
        reminderId: String,
        autoSync: Boolean = true,
        onDone: (suspend () -> Unit)? = null,
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            app.notesRepository.deleteReminder(reminderId)
            onDone?.invoke()
            if (autoSync && userPrefs.autoSyncAfterReminder) {
                withContext(Dispatchers.Main) { syncNow(showSuccess = true) }
            }
        }
    }
}
