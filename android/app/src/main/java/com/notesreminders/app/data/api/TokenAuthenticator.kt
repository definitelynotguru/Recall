package com.notesreminders.app.data.api

import com.notesreminders.app.data.auth.TokenStore
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

class TokenAuthenticator(
    private val tokenStore: TokenStore,
    private val refreshApi: suspend (RefreshRequest) -> RefreshResponse,
) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null
        val refresh = tokenStore.refreshToken ?: return null

        return runBlocking {
            try {
                val result = refreshApi(RefreshRequest(refresh))
                tokenStore.accessToken = result.access_token
                result.refresh_token?.let { tokenStore.refreshToken = it }
                response.request.newBuilder()
                    .header("Authorization", "Bearer ${result.access_token}")
                    .build()
            } catch (e: Exception) {
                if (TokenRefreshPolicy.shouldClearTokensOnRefreshFailure(e)) {
                    tokenStore.clear()
                }
                null
            }
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
