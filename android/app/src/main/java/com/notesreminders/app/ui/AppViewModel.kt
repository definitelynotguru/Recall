package com.notesreminders.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.notesreminders.app.NotesApp
import com.notesreminders.app.data.api.LoginRequest
import com.notesreminders.app.data.api.RegisterRequest
import com.notesreminders.app.data.api.RefreshRequest
import com.notesreminders.app.data.local.NoteEntity
import com.notesreminders.app.data.local.ReminderEntity
import com.notesreminders.app.sync.SyncWorker
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

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

    private val _authError = MutableStateFlow<String?>(null)
    val authError: StateFlow<String?> = _authError.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    fun login(email: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authError.value = null
            try {
                val res = app.api.login(LoginRequest(email, password))
                app.tokenStore.accessToken = res.access_token
                app.tokenStore.refreshToken = res.refresh_token
                app.tokenStore.userId = res.user.id
                app.tokenStore.userEmail = res.user.email
                SyncWorker.schedule(getApplication())
                syncNow()
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
                val res = app.api.register(RegisterRequest(email, password, secret))
                app.tokenStore.accessToken = res.access_token
                app.tokenStore.refreshToken = res.refresh_token
                app.tokenStore.userId = res.user.id
                app.tokenStore.userEmail = res.user.email
                SyncWorker.schedule(getApplication())
                syncNow()
                onSuccess()
            } catch (e: Exception) {
                _authError.value = e.message ?: "Registration failed"
            }
        }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            app.tokenStore.refreshToken?.let {
                try {
                    app.api.logout(RefreshRequest(it))
                } catch (_: Exception) {
                }
            }
            app.tokenStore.clear()
            app.database.noteDao().clearAll()
            onDone()
        }
    }

    fun syncNow() {
        viewModelScope.launch {
            _isSyncing.value = true
            app.notesRepository.syncNow()
            _isSyncing.value = false
        }
    }

    fun createNote(onCreated: (String) -> Unit) {
        viewModelScope.launch {
            val note = app.notesRepository.createNote("Untitled", "")
            onCreated(note.id)
        }
    }

    fun updateNote(id: String, title: String, body: String) {
        viewModelScope.launch {
            app.notesRepository.updateNote(id, title, body)
        }
    }

    fun deleteNote(id: String, onDone: () -> Unit) {
        viewModelScope.launch {
            app.notesRepository.deleteNote(id)
            onDone()
        }
    }

    suspend fun getNote(id: String): NoteEntity? = app.notesRepository.getNote(id)

    suspend fun getReminders(noteId: String): List<ReminderEntity> =
        app.notesRepository.getRemindersForNote(noteId)

    fun addReminder(
        noteId: String,
        fireAtIso: String,
        timezone: String,
        repeatRule: String?,
        onDone: (suspend () -> Unit)? = null,
    ) {
        viewModelScope.launch {
            app.notesRepository.addReminder(noteId, fireAtIso, timezone, repeatRule)
            onDone?.invoke()
        }
    }
}
