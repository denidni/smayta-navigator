// Smayta Transporte: GPS en segundo plano propio y libre.
package io.fleetbase.navigator.location

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject
import java.lang.ref.WeakReference

/** Pasa las posiciones del servicio a la app cuando está abierta. */
object LocationEvents {
    const val LOCATION = "SmaytaLocation.location"
    const val ERROR = "SmaytaLocation.error"
    const val STATE = "SmaytaLocation.state"

    @Volatile
    private var context: WeakReference<ReactApplicationContext>? = null

    fun attach(reactContext: ReactApplicationContext) {
        context = WeakReference(reactContext)
    }

    private fun emit(name: String, payload: Any?) {
        val ctx = context?.get() ?: return
        if (!ctx.hasActiveReactInstance()) return
        try {
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, payload)
        } catch (e: Exception) {
            // La app se está cerrando: el servicio sigue enviando al servidor.
        }
    }

    fun location(json: JSONObject) = emit(LOCATION, toMap(json))

    fun error(code: String) = emit(ERROR, Arguments.createMap().apply { putString("code", code) })

    fun state(enabled: Boolean) = emit(STATE, Arguments.createMap().apply { putBoolean("enabled", enabled) })

    fun toMap(json: JSONObject): WritableMap {
        val map = Arguments.createMap()
        json.keys().forEach { key ->
            when (val value = json.get(key)) {
                is JSONObject -> map.putMap(key, toMap(value))
                is JSONArray -> map.putArray(key, Arguments.fromList((0 until value.length()).map { value.get(it) }))
                is Boolean -> map.putBoolean(key, value)
                is Int -> map.putInt(key, value)
                is Long -> map.putDouble(key, value.toDouble())
                is Number -> map.putDouble(key, value.toDouble())
                JSONObject.NULL -> map.putNull(key)
                else -> map.putString(key, value.toString())
            }
        }
        return map
    }
}
