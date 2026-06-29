package com.notesreminders.app.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.notesreminders.app.NotesApp
import java.util.concurrent.TimeUnit

class SyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val app = applicationContext as NotesApp
        if (!app.tokenStore.isLoggedIn()) return Result.success()
        if (!app.networkMonitor.currentIsOnline()) return Result.success()

        val outcome = app.syncRepository.sync()
        if (outcome.success) return Result.success()

        val status = outcome.httpStatus
        val isPermanentClientError = status != null && status in 400..499 && status != 429
        val isRetryable = status == 429 || (status != null && status in 500..599) || outcome.isNetworkError

        if (isPermanentClientError) {
            recordPermanentFailure(app, status)
            return Result.failure()
        }
        if (isRetryable) {
            if (runAttemptCount >= MAX_RETRY_ATTEMPTS) {
                recordPermanentFailure(app, status)
                return Result.failure()
            }
            return Result.retry()
        }
        // Unknown failure: retry up to the cap, then give up.
        if (runAttemptCount >= MAX_RETRY_ATTEMPTS) {
            recordPermanentFailure(app, status)
            return Result.failure()
        }
        return Result.retry()
    }

    private suspend fun recordPermanentFailure(app: NotesApp, httpStatus: Int?) {
        val label = httpStatus?.let { "HTTP $it" } ?: "network or unknown error"
        val error = SyncErrorRecorder.buildSyncFailure("permanent sync failure ($label)")
        app.database.syncErrorDao().upsertAll(listOf(error))
    }

    companion object {
        private const val WORK_NAME = "notes_sync"
        private const val ONCE_WORK_NAME = "notes_sync_once"
        private const val MAX_RETRY_ATTEMPTS = 5

        private fun networkConstraints(): Constraints =
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(30, TimeUnit.MINUTES)
                .setConstraints(networkConstraints())
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }

        fun runOnce(context: Context) {
            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(networkConstraints())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                ONCE_WORK_NAME,
                ExistingWorkPolicy.KEEP,
                request,
            )
        }
    }
}

