package com.notesreminders.app.data.api

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

interface NotesApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): RefreshResponse

    @POST("auth/logout")
    suspend fun logout(@Body body: RefreshRequest)

    @GET("auth/me")
    suspend fun me(): Map<String, UserDto>

    @GET("notes")
    suspend fun listNotes(): NotesResponse

    @GET("notes/{id}")
    suspend fun getNote(@Path("id") id: String): NoteDetailResponse

    @POST("notes")
    suspend fun createNote(@Body note: NoteDto): Map<String, NoteDto>

    @PATCH("notes/{id}")
    suspend fun updateNote(@Path("id") id: String, @Body note: Map<String, String>): Map<String, NoteDto>

    @DELETE("notes/{id}")
    suspend fun deleteNote(@Path("id") id: String): Map<String, Boolean>

    @POST("notes/{noteId}/reminders")
    suspend fun createReminder(
        @Path("noteId") noteId: String,
        @Body body: Map<String, Any?>,
    ): Map<String, ReminderDto>

    @POST("reminders/{id}/complete")
    suspend fun completeReminder(@Path("id") id: String): Map<String, ReminderDto>

    @POST("reminders/{id}/snooze")
    suspend fun snoozeReminder(
        @Path("id") id: String,
        @Body body: SnoozeRequest,
    ): Map<String, ReminderDto>

    @PATCH("reminders/{id}")
    suspend fun updateReminder(
        @Path("id") id: String,
        @Body body: Map<String, Any?>,
    ): Map<String, ReminderDto>

    @DELETE("reminders/{id}")
    suspend fun deleteReminder(@Path("id") id: String): Map<String, Boolean>

    @POST("sync")
    suspend fun sync(@Body body: SyncRequest): SyncResponse
}
