package com.notesreminders.app.data.api

data class UserDto(val id: String, val email: String)

data class AuthResponse(
    val access_token: String,
    val refresh_token: String,
    val user: UserDto,
)

data class RefreshResponse(
    val access_token: String,
    val refresh_token: String?,
    val user: UserDto,
)

data class LoginRequest(val email: String, val password: String)

data class RegisterRequest(
    val email: String,
    val password: String,
    val register_secret: String,
)

data class RefreshRequest(val refresh_token: String)

data class NoteDto(
    val id: String,
    val user_id: String? = null,
    val title: String,
    val body: String,
    val status: String,
    val pinned_at: String? = null,
    val created_at: String,
    val updated_at: String,
    val deleted_at: String?,
)

data class ReminderDto(
    val id: String,
    val user_id: String? = null,
    val note_id: String,
    val fire_at: String,
    val timezone: String,
    val repeat_rule: String?,
    val intensity: String,
    val status: String,
    val completed_at: String?,
    val created_at: String,
    val updated_at: String,
    val deleted_at: String?,
)

data class TagDto(
    val id: String,
    val user_id: String? = null,
    val name: String,
    val created_at: String,
    val updated_at: String,
    val deleted_at: String?,
)

data class NoteTagDto(
    val id: String,
    val user_id: String? = null,
    val note_id: String,
    val tag_id: String,
    val created_at: String,
    val updated_at: String,
    val deleted_at: String?,
)

data class NotesResponse(val notes: List<NoteDto>)

data class NoteDetailResponse(val note: NoteDto, val reminders: List<ReminderDto>)

data class SyncRequest(
    val device_id: String,
    val last_sync_at: String,
    val notes: List<NoteDto>,
    val reminders: List<ReminderDto>,
    val tags: List<TagDto> = emptyList(),
    val note_tags: List<NoteTagDto> = emptyList(),
)

data class SyncResponse(
    val server_time: String,
    val notes: List<NoteDto>,
    val reminders: List<ReminderDto>,
    val tags: List<TagDto>? = emptyList(),
    val note_tags: List<NoteTagDto>? = emptyList(),
)

data class SnoozeRequest(val fire_at: String)

data class DebugReportRequest(
    val device_id: String,
    val app_version: String,
    val api_base_url: String,
    val payload: Map<String, Any?>,
)

data class DebugReportResponse(
    val id: String,
    val created_at: String,
)

data class ErrorResponse(val error: String?)
