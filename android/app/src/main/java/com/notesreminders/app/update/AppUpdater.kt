package com.notesreminders.app.update

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.notesreminders.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

object AppUpdater {
    private val client = OkHttpClient.Builder()
        .connectTimeout(2, TimeUnit.MINUTES)
        .readTimeout(2, TimeUnit.MINUTES)
        .followRedirects(true)
        .build()

    suspend fun downloadLatestApk(context: Context): Result<File> = withContext(Dispatchers.IO) {
        runCatching {
            val urls = resolveDownloadUrls()
            var lastError: Throwable? = null
            for (url in urls) {
                val result = runCatching { downloadFromUrl(context, url) }
                if (result.isSuccess) return@runCatching result.getOrThrow()
                lastError = result.exceptionOrNull()
            }
            throw lastError ?: error("No download URL available")
        }
    }

    private fun resolveDownloadUrls(): List<String> {
        val configured = BuildConfig.UPDATE_APK_URL.trim()
        val urls = mutableListOf<String>()
        if (configured.isNotEmpty()) urls.add(configured)
        resolveLatestReleaseApkUrl()?.let { urls.add(it) }
        return urls.distinct()
    }

    /** GitHub latest release asset (public repos). */
    private fun resolveLatestReleaseApkUrl(): String? {
        val request = Request.Builder()
            .url("https://api.github.com/repos/definitelynotguru/Recall/releases/latest")
            .header("Accept", "application/vnd.github+json")
            .get()
            .build()
        return runCatching {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null
                val body = response.body?.string() ?: return null
                val json = JSONObject(body)
                val assets = json.optJSONArray("assets") ?: return null
                for (i in 0 until assets.length()) {
                    val asset = assets.getJSONObject(i)
                    val name = asset.optString("name", "")
                    if (name.endsWith(".apk")) {
                        return asset.getString("browser_download_url")
                    }
                }
                null
            }
        }.getOrNull()
    }

    private fun downloadFromUrl(context: Context, url: String): File {
        val request = Request.Builder().url(url).get().build()
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) {
            error("Download failed for $url: HTTP ${response.code}")
        }
        val body = response.body ?: error("Empty response from $url")
        val dest = File(context.cacheDir, "recall-update.apk")
        dest.outputStream().use { out -> body.byteStream().copyTo(out) }
        if (dest.length() < 1_000_000) {
            error("Downloaded file too small (${dest.length()} bytes) — not a valid APK")
        }
        return dest
    }

    fun canInstallPackages(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
        return context.packageManager.canRequestPackageInstalls()
    }

    fun openInstallPermissionSettings(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val intent = Intent(
            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:${context.packageName}"),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    fun promptInstall(activity: Activity, apk: File) {
        val uri = FileProvider.getUriForFile(
            activity,
            "${activity.packageName}.fileprovider",
            apk,
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        activity.startActivity(intent)
    }
}
