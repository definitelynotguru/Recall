package com.notesreminders.app.reminders

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.json.JSONObject

private val Context.alarmDataStore by preferencesDataStore("alarm_registry")

class AlarmRegistry(private val context: Context) {
    private val key = stringPreferencesKey("scheduled")

    suspend fun load(): MutableMap<String, String> {
        val raw = context.alarmDataStore.data.first()[key] ?: return mutableMapOf()
        val json = JSONObject(raw)
        val map = mutableMapOf<String, String>()
        json.keys().forEach { id ->
            map[id] = json.getString(id)
        }
        return map
    }

    suspend fun save(map: Map<String, String>) {
        val json = JSONObject()
        map.forEach { (id, fireAt) -> json.put(id, fireAt) }
        context.alarmDataStore.edit { it[key] = json.toString() }
    }

    fun loadBlocking(): MutableMap<String, String> = runBlocking { load() }

    fun saveBlocking(map: Map<String, String>) = runBlocking { save(map) }
}
