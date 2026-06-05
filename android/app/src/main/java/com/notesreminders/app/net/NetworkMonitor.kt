package com.notesreminders.app.net

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class NetworkMonitor(context: Context) {
    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val _isOnline = MutableStateFlow(checkOnline())
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    private var wasOnline: Boolean = _isOnline.value

    var onReconnect: (() -> Unit)? = null

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            updateState()
        }

        override fun onLost(network: Network) {
            updateState()
        }

        override fun onCapabilitiesChanged(
            network: Network,
            networkCapabilities: NetworkCapabilities,
        ) {
            updateState()
        }
    }

    fun start() {
        refresh()
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager.registerNetworkCallback(request, callback)
    }

    fun stop() {
        try {
            connectivityManager.unregisterNetworkCallback(callback)
        } catch (_: IllegalArgumentException) {
        }
    }

    /** Re-check connectivity (e.g. after resume from sleep). */
    fun refresh() {
        updateState()
    }

    fun currentIsOnline(): Boolean = checkOnline()

    fun snapshot(): Map<String, Any?> {
        val network = connectivityManager.activeNetwork
        val caps = network?.let { connectivityManager.getNetworkCapabilities(it) }
        return mapOf(
            "monitor_online" to _isOnline.value,
            "fresh_check_online" to checkOnline(),
            "active_network_present" to (network != null),
            "has_internet_capability" to caps?.hasCapability(
                NetworkCapabilities.NET_CAPABILITY_INTERNET,
            ),
            "validated" to caps?.hasCapability(
                NetworkCapabilities.NET_CAPABILITY_VALIDATED,
            ),
            "not_suspended" to caps?.hasCapability(
                NetworkCapabilities.NET_CAPABILITY_NOT_SUSPENDED,
            ),
            "transport" to transportLabel(caps),
            "sdk_int" to Build.VERSION.SDK_INT,
        )
    }

    private fun updateState() {
        val online = checkOnline()
        val previous = wasOnline
        wasOnline = online
        _isOnline.value = online
        if (!previous && online) {
            onReconnect?.invoke()
        }
    }

    /**
     * Treat as online when the active network has Internet. Do not require VALIDATED —
     * that flag is often false briefly after unlock/resume even on working Wi‑Fi/cellular.
     */
    private fun checkOnline(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val caps = connectivityManager.getNetworkCapabilities(network) ?: return false
        if (!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
            return false
        }
        if (caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
            return true
        }
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_SUSPENDED) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_RESTRICTED)
    }

    private fun transportLabel(caps: NetworkCapabilities?): String {
        if (caps == null) return "none"
        return buildList {
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) add("wifi")
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) add("cellular")
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) add("ethernet")
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) add("vpn")
        }.joinToString(",").ifBlank { "other" }
    }
}
