package com.notesreminders.app.data.api

import com.notesreminders.app.BuildConfig
import com.notesreminders.app.data.auth.TokenStore
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    fun create(tokenStore: TokenStore): NotesApi {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val authInterceptor = Interceptor { chain ->
            val token = tokenStore.accessToken
            val request = if (token != null) {
                chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer $token")
                    .build()
            } else {
                chain.request()
            }
            chain.proceed(request)
        }

        val retrofit = Retrofit.Builder()
            .baseUrl(ensureTrailingSlash(BuildConfig.API_BASE_URL))
            .addConverterFactory(GsonConverterFactory.create())
            .client(
                OkHttpClient.Builder()
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .addInterceptor(authInterceptor)
                    .addInterceptor(logging)
                    .authenticator(
                        TokenAuthenticator(tokenStore) { body ->
                            Retrofit.Builder()
                                .baseUrl(ensureTrailingSlash(BuildConfig.API_BASE_URL))
                                .addConverterFactory(GsonConverterFactory.create())
                                .build()
                                .create(NotesApi::class.java)
                                .refresh(body)
                        },
                    )
                    .build(),
            )
            .build()

        return retrofit.create(NotesApi::class.java)
    }

    private fun ensureTrailingSlash(url: String): String =
        if (url.endsWith("/")) url else "$url/"
}
