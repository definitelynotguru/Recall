package com.notesreminders.app

import android.app.Application
import androidx.room.Room
import com.notesreminders.app.data.NotesRepository
import com.notesreminders.app.data.UserPrefs
import com.notesreminders.app.data.api.ApiClient
import com.notesreminders.app.data.auth.TokenStore
import com.notesreminders.app.data.local.AppDatabase
import com.notesreminders.app.net.NetworkMonitor
import com.notesreminders.app.reminders.ReminderReconciler
import com.notesreminders.app.sync.SyncRepository
import com.notesreminders.app.sync.SyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class NotesApp : Application() {
    lateinit var tokenStore: TokenStore
    lateinit var database: AppDatabase
    lateinit var api: com.notesreminders.app.data.api.NotesApi
    lateinit var syncRepository: SyncRepository
    lateinit var notesRepository: NotesRepository
    lateinit var userPrefs: UserPrefs
    lateinit var networkMonitor: NetworkMonitor

    override fun onCreate() {
        super.onCreate()
        tokenStore = TokenStore(this)
        userPrefs = UserPrefs(this)
        database = Room.databaseBuilder(this, AppDatabase::class.java, "notes.db")
            .fallbackToDestructiveMigration()
            .build()
        api = ApiClient.create(tokenStore)
        syncRepository = SyncRepository(this, database, tokenStore)
        val reconciler = ReminderReconciler(this, database.reminderDao())
        notesRepository = NotesRepository(
            database,
            api,
            tokenStore,
            syncRepository,
            reconciler,
        )
        networkMonitor = NetworkMonitor(this).apply {
            onReconnect = {
                if (tokenStore.isLoggedIn()) {
                    SyncWorker.runOnce(this@NotesApp)
                }
            }
            start()
        }
        if (tokenStore.isLoggedIn()) {
            SyncWorker.schedule(this)
            appScope.launch {
                notesRepository.reconcileAlarms()
            }
        }
    }

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
}
