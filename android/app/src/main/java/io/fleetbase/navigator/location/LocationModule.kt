// Smayta Transporte: GPS en segundo plano propio y libre (sustituye al plugin de pago de Transistorsoft en Android).
package io.fleetbase.navigator.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import org.json.JSONObject

/** Módulo nativo `SmaytaLocation` que usa la app (src/utils/background-location.android.js). */
class LocationModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val settings = LocationSettings(reactContext)

    init {
        LocationEvents.attach(reactContext)
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun configure(config: ReadableMap, promise: Promise) {
        if (config.hasKey("url")) settings.url = config.getString("url") ?: ""
        if (config.hasKey("headers") && config.getType("headers") == ReadableType.Map) {
            val headers = JSONObject()
            val map = config.getMap("headers")!!
            val it = map.keySetIterator()
            while (it.hasNextKey()) {
                val key = it.nextKey()
                headers.put(key, map.getString(key) ?: "")
            }
            settings.headers = headers
        }
        if (config.hasKey("distanceFilter")) settings.distanceFilter = config.getDouble("distanceFilter").toFloat()
        if (config.hasKey("interval")) settings.intervalMs = config.getDouble("interval").toLong()
        if (config.hasKey("heartbeatInterval")) settings.heartbeatMs = config.getDouble("heartbeatInterval").toLong().coerceAtLeast(15_000L)
        if (config.hasKey("startOnBoot")) settings.startOnBoot = config.getBoolean("startOnBoot")
        if (config.hasKey("notificationTitle")) settings.notificationTitle = config.getString("notificationTitle") ?: "Smayta Transporte"
        if (config.hasKey("notificationText")) settings.notificationText = config.getString("notificationText") ?: ""
        if (config.hasKey("channelName")) settings.channelName = config.getString("channelName") ?: "Smayta Transporte"
        promise.resolve(state())
    }

    @ReactMethod
    fun start(promise: Promise) {
        if (!LocationService.hasPermission(reactContext)) {
            promise.reject("permission_denied", "Location permission not granted")
            return
        }
        try {
            settings.enabled = true
            LocationService.start(reactContext)
            promise.resolve(state())
        } catch (e: Exception) {
            promise.reject("start_failed", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        settings.enabled = false
        LocationService.stop(reactContext)
        promise.resolve(state())
    }

    @ReactMethod
    fun getState(promise: Promise) {
        promise.resolve(state())
    }

    /** Una posición al momento: la mejor que dé el GPS o la red en el tiempo indicado; si no, la última conocida. */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun getCurrentPosition(options: ReadableMap, promise: Promise) {
        if (!LocationService.hasPermission(reactContext)) {
            promise.reject("permission_denied", "Location permission not granted")
            return
        }
        val timeout = if (options.hasKey("timeout")) options.getDouble("timeout").toLong() else 15_000L
        val maximumAge = if (options.hasKey("maximumAge")) options.getDouble("maximumAge").toLong() else 10_000L
        val lm = reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER).filter {
            try { lm.isProviderEnabled(it) } catch (e: Exception) { false }
        }
        val last = providers.mapNotNull { try { lm.getLastKnownLocation(it) } catch (e: Exception) { null } }
            .maxByOrNull { it.time }
        if (last != null && System.currentTimeMillis() - last.time <= maximumAge) {
            promise.resolve(LocationEvents.toMap(LocationPayload.app(reactContext, last)))
            return
        }
        if (providers.isEmpty()) {
            if (last != null) promise.resolve(LocationEvents.toMap(LocationPayload.app(reactContext, last)))
            else promise.reject("location_unavailable", "Location services are disabled")
            return
        }

        val handler = Handler(Looper.getMainLooper())
        var done = false
        lateinit var listener: LocationListener
        val finish = { location: Location? ->
            if (!done) {
                done = true
                lm.removeUpdates(listener)
                val best = location ?: last
                if (best != null) promise.resolve(LocationEvents.toMap(LocationPayload.app(reactContext, best)))
                else promise.reject("timeout", "No location within timeout")
            }
        }
        listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                // La red llega antes; si es poco precisa se espera al GPS hasta el límite.
                if (location.provider == LocationManager.GPS_PROVIDER || location.accuracy <= 50f || providers.size == 1) {
                    handler.post { finish(location) }
                }
            }
            @Deprecated("Necesario en Android antiguos")
            override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }
        handler.post {
            providers.forEach {
                try { lm.requestLocationUpdates(it, 0L, 0f, listener, Looper.getMainLooper()) } catch (e: Exception) {}
            }
        }
        handler.postDelayed({
            val fallback = providers.mapNotNull { try { lm.getLastKnownLocation(it) } catch (e: Exception) { null } }.maxByOrNull { it.time }
            finish(fallback)
        }, timeout)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Double) {}

    private fun state() = com.facebook.react.bridge.Arguments.createMap().apply {
        putBoolean("enabled", settings.enabled)
        putBoolean("hasPermission", LocationService.hasPermission(reactContext))
        putDouble("distanceFilter", settings.distanceFilter.toDouble())
    }

    companion object {
        const val NAME = "SmaytaLocation"
    }
}
