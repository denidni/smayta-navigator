// Smayta Transporte: GPS en segundo plano propio y libre (sustituye al plugin de pago de Transistorsoft en Android).
package io.fleetbase.navigator.location

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/** Ajustes del seguimiento guardados en el teléfono, para que el servicio siga tras cerrar la app o reiniciar. */
class LocationSettings(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("smayta_location", Context.MODE_PRIVATE)

    var url: String
        get() = prefs.getString("url", "") ?: ""
        set(value) = prefs.edit().putString("url", value).apply()

    var headers: JSONObject
        get() = try { JSONObject(prefs.getString("headers", "{}") ?: "{}") } catch (e: Exception) { JSONObject() }
        set(value) = prefs.edit().putString("headers", value.toString()).apply()

    var distanceFilter: Float
        get() = prefs.getFloat("distance_filter", 10f)
        set(value) = prefs.edit().putFloat("distance_filter", value).apply()

    var intervalMs: Long
        get() = prefs.getLong("interval_ms", 5000L)
        set(value) = prefs.edit().putLong("interval_ms", value).apply()

    var heartbeatMs: Long
        get() = prefs.getLong("heartbeat_ms", 60000L)
        set(value) = prefs.edit().putLong("heartbeat_ms", value).apply()

    var startOnBoot: Boolean
        get() = prefs.getBoolean("start_on_boot", true)
        set(value) = prefs.edit().putBoolean("start_on_boot", value).apply()

    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) = prefs.edit().putBoolean("enabled", value).apply()

    var notificationTitle: String
        get() = prefs.getString("notification_title", "Smayta Transporte") ?: "Smayta Transporte"
        set(value) = prefs.edit().putString("notification_title", value).apply()

    var notificationText: String
        get() = prefs.getString("notification_text", "") ?: ""
        set(value) = prefs.edit().putString("notification_text", value).apply()

    var channelName: String
        get() = prefs.getString("channel_name", "Smayta Transporte") ?: "Smayta Transporte"
        set(value) = prefs.edit().putString("channel_name", value).apply()

    /** Posiciones que no se pudieron enviar (sin cobertura). Se guardan las últimas [MAX_PENDING]. */
    fun pending(): JSONArray = try { JSONArray(prefs.getString("pending", "[]") ?: "[]") } catch (e: Exception) { JSONArray() }

    fun setPending(list: JSONArray) {
        val trimmed = JSONArray()
        val start = maxOf(0, list.length() - MAX_PENDING)
        for (i in start until list.length()) trimmed.put(list.get(i))
        prefs.edit().putString("pending", trimmed.toString()).apply()
    }

    companion object {
        const val MAX_PENDING = 100
    }
}
