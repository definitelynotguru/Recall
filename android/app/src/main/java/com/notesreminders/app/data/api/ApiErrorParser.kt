package com.notesreminders.app.data.api

import com.google.gson.Gson
import com.google.gson.JsonObject
import retrofit2.HttpException

object ApiErrorParser {
    private val gson = Gson()

    fun syncFailureMessage(error: Throwable): String {
        if (error !is HttpException) {
            return "Sync failed: ${error.message ?: "check connection"}"
        }
        val code = error.code()
        val body = error.response()?.errorBody()?.string()
        if (body.isNullOrBlank()) {
            return "Sync failed: HTTP $code"
        }
        return try {
            val json = gson.fromJson(body, JsonObject::class.java)
            val base = json.get("error")?.asString ?: "HTTP $code"
            val issues = json.getAsJsonArray("issues")
            val detail = if (issues != null && issues.size() > 0) {
                val first = issues[0].asJsonObject
                val path = first.get("path")?.asString ?: ""
                val msg = first.get("message")?.asString ?: ""
                if (path.isNotBlank()) " ($path: $msg)" else " ($msg)"
            } else {
                ""
            }
            "Sync failed: $base$detail".take(220)
        } catch (_: Exception) {
            "Sync failed: HTTP $code"
        }
    }
}
