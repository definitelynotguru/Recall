package com.notesreminders.app.data.api

import retrofit2.HttpException
import java.io.IOException

/**
 * Decides whether a failed token refresh should clear stored credentials.
 * Network errors must not log the user out; only definitive auth failures should.
 */
object TokenRefreshPolicy {
    fun shouldClearTokensOnRefreshFailure(error: Throwable): Boolean {
        if (error is IOException) return false
        if (error is HttpException) {
            return error.code() == 401 || error.code() == 403
        }
        return false
    }
}
