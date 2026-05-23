package com.notesreminders.app.data.api

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException
import java.net.SocketTimeoutException

class TokenRefreshPolicyTest {
    @Test
    fun networkErrorsDoNotClearTokens() {
        assertFalse(TokenRefreshPolicy.shouldClearTokensOnRefreshFailure(IOException()))
        assertFalse(
            TokenRefreshPolicy.shouldClearTokensOnRefreshFailure(
                SocketTimeoutException("timeout"),
            ),
        )
    }

    @Test
    fun authFailuresClearTokens() {
        assertTrue(
            TokenRefreshPolicy.shouldClearTokensOnRefreshFailure(httpError(401)),
        )
        assertTrue(
            TokenRefreshPolicy.shouldClearTokensOnRefreshFailure(httpError(403)),
        )
    }

    @Test
    fun transientServerErrorsDoNotClearTokens() {
        assertFalse(
            TokenRefreshPolicy.shouldClearTokensOnRefreshFailure(httpError(500)),
        )
        assertFalse(
            TokenRefreshPolicy.shouldClearTokensOnRefreshFailure(httpError(503)),
        )
    }

    @Test
    fun unknownErrorsDoNotClearTokens() {
        assertFalse(
            TokenRefreshPolicy.shouldClearTokensOnRefreshFailure(
                IllegalStateException("unexpected"),
            ),
        )
    }

    private fun httpError(code: Int): HttpException {
        return HttpException(Response.error<String>(code, okhttp3.ResponseBody.create(null, "")))
    }
}
