package com.notesreminders.app.ui.sync

import com.notesreminders.app.NotesApp
import com.notesreminders.app.data.api.ApiErrorParser
import com.notesreminders.app.sync.SyncDiagnostics
import com.notesreminders.app.ui.components.OFFLINE_SYNC_MESSAGE
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

class SyncCoordinator(
    private val app: NotesApp,
    private val scope: CoroutineScope,
) {
    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _syncHint = MutableStateFlow<String?>(null)
    val syncHint: StateFlow<String?> = _syncHint.asStateFlow()

    private val _lastSyncAt = MutableStateFlow<String?>(null)
    val lastSyncAt: StateFlow<String?> = _lastSyncAt.asStateFlow()

    fun refreshConnectivity() {
        app.networkMonitor.refresh()
        if (app.networkMonitor.currentIsOnline() && _syncHint.value == OFFLINE_SYNC_MESSAGE) {
            _syncHint.value = null
        }
    }

    fun syncNow(
        showSuccess: Boolean = true,
        beforeSync: suspend () -> Unit = {},
    ) {
        if (_isSyncing.value) return
        app.networkMonitor.refresh()
        if (!app.networkMonitor.currentIsOnline()) {
            _syncHint.value = OFFLINE_SYNC_MESSAGE
            return
        }
        scope.launch {
            beforeSync()
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
                    _lastSyncAt.value = withContext(Dispatchers.IO) {
                        app.notesRepository.getLastSyncAt()
                    }
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

    fun clearHint() {
        _syncHint.value = null
    }
}
