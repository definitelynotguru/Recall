package com.notesreminders.app.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface NotesApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): RefreshResponse

    @POST("auth/logout")
    suspend fun logout(@Body body: RefreshRequest)

    @POST("reminders/{id}/complete")
    suspend fun completeReminder(@Path("id") id: String): Map<String, ReminderDto>

    @POST("reminders/{id}/snooze")
    suspend fun snoozeReminder(
        @Path("id") id: String,
        @Body body: SnoozeRequest,
    ): Map<String, ReminderDto>

    @POST("sync")
    suspend fun sync(@Body body: SyncRequest): SyncResponse

    @GET("sync/poll")
    suspend fun pollSync(@Query("since") since: String): SyncPollResponse

    @POST("debug/report")
    suspend fun submitDebugReport(@Body body: DebugReportRequest): DebugReportResponse
}
