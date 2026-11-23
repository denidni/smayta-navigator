// Smayta Transporte: GPS en segundo plano propio y libre.
package io.fleetbase.navigator.location

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.location.Location
import android.os.BatteryManager
import android.os.Build
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Convierte una posición en el JSON que espera Fleetbase en `drivers/{id}/track`
 * (los mismos campos que mandaba el plugin anterior).
 */
object LocationPayload {
    private fun iso(time: Long): String {
        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        format.timeZone = TimeZone.getTimeZone("UTC")
        return format.format(Date(time))
    }

    fun activity(speed: Float): String = when {
        speed >= 3f -> "in_vehicle"
        speed >= 0.7f -> "on_foot"
        else -> "still"
    }

    fun battery(context: Context): JSONObject {
        val status: Intent? = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = status?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = status?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val plugged = status?.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) ?: 0
        return JSONObject()
            .put("level", if (level >= 0 && scale > 0) level.toDouble() / scale else -1.0)
            .put("is_charging", plugged != 0)
    }

    /** Cuerpo que se envía al servidor. */
    fun server(context: Context, location: Location): JSONObject {
        val speed = if (location.hasSpeed()) location.speed else 0f
        return JSONObject()
            .put("latitude", location.latitude)
            .put("longitude", location.longitude)
            .put("heading", if (location.hasBearing()) location.bearing.toDouble() else -1.0)
            .put("speed", if (location.hasSpeed()) speed.toDouble() else -1.0)
            .put("altitude", if (location.hasAltitude()) location.altitude else 0.0)
            .put("timestamp", iso(location.time))
            .put("activity", activity(speed))
            .put("is_moving", speed >= 0.7f)
            .put("battery", battery(context))
    }

    /** Objeto que recibe la app (misma forma que antes: coords, timestamp, is_moving, activity, battery). */
    fun app(context: Context, location: Location): JSONObject {
        val speed = if (location.hasSpeed()) location.speed else 0f
        val coords = JSONObject()
            .put("latitude", location.latitude)
            .put("longitude", location.longitude)
            .put("accuracy", location.accuracy.toDouble())
            .put("speed", if (location.hasSpeed()) speed.toDouble() else -1.0)
            .put("heading", if (location.hasBearing()) location.bearing.toDouble() else -1.0)
            .put("altitude", if (location.hasAltitude()) location.altitude else 0.0)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && location.hasVerticalAccuracy()) {
            coords.put("altitude_accuracy", location.verticalAccuracyMeters.toDouble())
        }
        return JSONObject()
            .put("coords", coords)
            .put("timestamp", iso(location.time))
            .put("is_moving", speed >= 0.7f)
            .put("activity", JSONObject().put("type", activity(speed)))
            .put("battery", battery(context))
    }
}
