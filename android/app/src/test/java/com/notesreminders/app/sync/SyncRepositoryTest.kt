package com.notesreminders.app.sync

import android.content.Context
import androidx.room.Room
import com.notesreminders.app.data.api.AuthResponse
import com.notesreminders.app.data.api.DebugReportRequest
import com.notesreminders.app.data.api.DebugReportResponse
import com.notesreminders.app.data.api.LoginRequest
import com.notesreminders.app.data.api.NotesApi
import com.notesreminders.app.data.api.RefreshRequest
import com.notesreminders.app.data.api.RefreshResponse
import com.notesreminders.app.data.api.RegisterRequest
import com.notesreminders.app.data.api.ReminderDto
import com.notesreminders.app.data.api.SnoozeRequest
import com.notesreminders.app.data.api.SyncPollCounts
import com.notesreminders.app.data.api.SyncPollResponse
import com.notesreminders.app.data.api.SyncRequest
import com.notesreminders.app.data.api.SyncResponse
import com.notesreminders.app.data.auth.TokenStore
import com.notesreminders.app.data.local.AppDatabase
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.io.IOException
import java.util.Collections

@RunWith(RobolectricTestRunner::class)
class SyncRepositoryTest {
    private lateinit var db: AppDatabase

    @Before
    fun setUp() {
        val context = RuntimeEnvironment.getApplication()
        db =
            Room
                .inMemoryDatabaseBuilder(context, AppDatabase::class.java)
                .allowMainThreadQueries()
                .build()
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun concurrentSyncsReuseOnePersistedDeviceId() =
        runTest {
            val context: Context = RuntimeEnvironment.getApplication()
            val tokenStore = mock(TokenStore::class.java)
            `when`(tokenStore.userId).thenReturn("user-id")
            val api = BlockingNotesApi()
            val repository = SyncRepository(context, db, tokenStore, api)

            val first = async { repository.sync() }
            val second = async { repository.sync() }

            api.pollEntered.await()
            assertEquals(1, api.pollCalls)
            api.releasePoll.complete(Unit)
            first.await()
            second.await()

            assertEquals(2, api.requests.size)
            assertEquals(1, api.requests.map { it.device_id }.distinct().size)
            assertEquals(
                api.requests.first().device_id,
                db.syncMetaDao().get()?.deviceId,
            )
            db.openHelper.readableDatabase
                .query("SELECT COUNT(*) FROM sync_meta")
                .use { cursor ->
                    assertTrue(cursor.moveToFirst())
                    assertEquals(1, cursor.getInt(0))
                }
        }
}

private class BlockingNotesApi : NotesApi {
    val pollEntered = CompletableDeferred<Unit>()
    val releasePoll = CompletableDeferred<Unit>()
    val requests = Collections.synchronizedList(mutableListOf<SyncRequest>())
    var pollCalls = 0
        private set

    override suspend fun pollSync(since: String): SyncPollResponse {
        pollCalls += 1
        pollEntered.complete(Unit)
        releasePoll.await()
        return SyncPollResponse(
            server_time = "2025-01-01T00:00:00Z",
            has_changes = true,
            counts = SyncPollCounts(),
        )
    }

    override suspend fun sync(body: SyncRequest): SyncResponse {
        requests += body
        throw IOException("stop after request capture")
    }

    override suspend fun login(body: LoginRequest): AuthResponse = unused()

    override suspend fun register(body: RegisterRequest): AuthResponse = unused()

    override suspend fun refresh(body: RefreshRequest): RefreshResponse = unused()

    override suspend fun logout(body: RefreshRequest) = unused<Unit>()

    override suspend fun completeReminder(
        id: String,
    ): Map<String, ReminderDto> = unused()

    override suspend fun snoozeReminder(
        id: String,
        body: SnoozeRequest,
    ): Map<String, ReminderDto> = unused()

    override suspend fun submitDebugReport(
        body: DebugReportRequest,
    ): DebugReportResponse = unused()

    private fun <T> unused(): T = error("Unexpected API call")
}
