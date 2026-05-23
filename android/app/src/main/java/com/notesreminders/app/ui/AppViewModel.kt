package com.notesreminders.app.ui

import android.app.Application
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
import com.notesreminders.app.debug.DebugReportCollector
import com.notesreminders.app.sync.SyncDiagnostics
import com.notesreminders.app.sync.SyncWorker
import com.notesreminders.app.ui.components.OFFLINE_SYNC_MESSAGE
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as NotesApp

    val isLoggedIn: Boolean
        get() = app.tokenStore.isLoggedIn()

    val userEmail: String?
        get() = app.tokenStore.userEmail

    val notes = app.notesRepository.observeNotes().stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        emptyList(),
    )

    val reminders = app.notesRepository.observeReminders().stateIn(
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
            app.tokenStore.clear()
            _syncHint.value = null
            onDone()
        }
    }

    fun syncNow(showSuccess: Boolean = true) {
        if (_isSyncing.value) return
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

    fun sendDebugReport(onResult: (String) -> Unit) {
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
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

    fun deleteNote(id: String, onDone: () -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            app.notesRepository.deleteNote(id)
            withContext(Dispatchers.Main) { onDone() }
        }
    }

    suspend fun getNote(id: String): NoteEntity? = withContext(Dispatchers.IO) {
        app.notesRepository.getNote(id)
    }

    suspend fun getReminders(noteId: String): List<ReminderEntity> = withContext(Dispatchers.IO) {
        app.notesRepository.getRemindersForNote(noteId)
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
