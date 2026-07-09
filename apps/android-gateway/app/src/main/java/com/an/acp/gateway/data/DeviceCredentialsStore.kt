package com.an.acp.gateway.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "acp_gateway_prefs")

class DeviceCredentialsStore(private val context: Context) {
    private object Keys {
        val DEVICE_ID = stringPreferencesKey("device_id")
        val DEVICE_TOKEN = stringPreferencesKey("device_token")
        val API_BASE_URL = stringPreferencesKey("api_base_url")
    }

    val deviceId: Flow<String?> = context.dataStore.data.map { it[Keys.DEVICE_ID] }
    val deviceToken: Flow<String?> = context.dataStore.data.map { it[Keys.DEVICE_TOKEN] }
    val apiBaseUrl: Flow<String?> = context.dataStore.data.map { it[Keys.API_BASE_URL] }

    suspend fun currentToken(): String? = deviceToken.first()

    suspend fun save(deviceId: String, deviceToken: String, apiBaseUrl: String) {
        context.dataStore.edit { prefs ->
            prefs[Keys.DEVICE_ID] = deviceId
            prefs[Keys.DEVICE_TOKEN] = deviceToken
            prefs[Keys.API_BASE_URL] = apiBaseUrl
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
