// Smayta Transporte: GPS en segundo plano propio y libre (sustituye al plugin de pago de Transistorsoft en Android).
package io.fleetbase.navigator.location

import android.Manifest
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import io.fleetbase.navigator.R
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Servicio en primer plano (con aviso fijo) que sigue la posición del conductor aunque la app
 * esté en segundo plano o cerrada, y la envía al servidor desde el propio teléfono.
 * Usa solo el GPS y la red del sistema Android: sin licencias de pago ni Google Play Services.
 */
class LocationService : Service(), LocationListener {
    private lateinit var settings: LocationSettings
    private var manager: LocationManager? = null
    private var lastSent: Location? = null
    private var lastFix: Location? = null
    private val sender = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private val heartbeat = object : Runnable {
        override fun run() {
            // Si está quieto, vuelve a mandar la última posición para que se vea conectado.
            lastFix?.let { send(it, force = true) }
            handler.postDelayed(this, settings.heartbeatMs)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        settings = LocationSettings(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!hasPermission(this)) {
            LocationEvents.error("permission_denied")
            stopSelf()
            return START_NOT_STICKY
        }
        try {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                notification(),
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0
            )
        } catch (e: Exception) {
            // Android no deja empezar desde segundo plano: se reintentará al abrir la app.
            LocationEvents.error("start_not_allowed")
            stopSelf()
            return START_NOT_STICKY
        }
        startUpdates()
        LocationEvents.state(true)
        return START_STICKY
    }

    @SuppressLint("MissingPermission")
    private fun startUpdates() {
        val lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        manager?.removeUpdates(this)
        manager = lm
        val minDistance = settings.distanceFilter.coerceAtLeast(0f)
        for (provider in listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)) {
            try {
                if (lm.allProviders.contains(provider)) {
                    lm.requestLocationUpdates(provider, settings.intervalMs, minDistance, this, Looper.getMainLooper())
                }
            } catch (e: Exception) {
                // Ese proveedor no está en este teléfono.
            }
        }
        handler.removeCallbacks(heartbeat)
        handler.postDelayed(heartbeat, settings.heartbeatMs)
    }

    override fun onLocationChanged(location: Location) {
        // Si el GPS da una posición buena reciente, no la cambia por una peor de la red.
        val previous = lastFix
        if (previous != null && location.provider == LocationManager.NETWORK_PROVIDER &&
            previous.provider == LocationManager.GPS_PROVIDER &&
            location.time - previous.time < 30_000 && location.accuracy > previous.accuracy
        ) {
            return
        }
        if (location.accuracy > MAX_ACCURACY_METERS && previous != null && location.time - previous.time < 60_000) {
            return
        }
        lastFix = location
        LocationEvents.location(LocationPayload.app(this, location))
        send(location, force = false)
    }

    private fun send(location: Location, force: Boolean) {
        val previous = lastSent
        if (!force && previous != null && previous.distanceTo(location) < settings.distanceFilter) return
        lastSent = location
        val body = LocationPayload.server(this, location)
        sender.execute { deliver(body) }
    }

    /** Manda las posiciones pendientes y la nueva, en orden; si no hay cobertura las guarda. */
    private fun deliver(body: JSONObject) {
        val url = settings.url
        if (url.isBlank()) return
        val queue = settings.pending()
        queue.put(body)
        val left = JSONArray()
        var failed = false
        for (i in 0 until queue.length()) {
            val item = queue.getJSONObject(i)
            if (failed || !post(url, item)) {
                failed = true
                left.put(item)
            }
        }
        settings.setPending(left)
    }

    private fun post(url: String, body: JSONObject): Boolean {
        var connection: HttpURLConnection? = null
        return try {
            connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15_000
                readTimeout = 15_000
                doOutput = true
                val headers = settings.headers
                headers.keys().forEach { key -> setRequestProperty(key, headers.optString(key)) }
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
            }
            connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val code = connection.responseCode
            // 4xx (sesión caducada, datos no válidos) no se reintenta: solo errores de red o del servidor.
            code in 200..499
        } catch (e: Exception) {
            false
        } finally {
            connection?.disconnect()
        }
    }

    private fun notification(): Notification {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, settings.channelName, NotificationManager.IMPORTANCE_LOW)
            channel.setShowBadge(false)
            nm.createNotificationChannel(channel)
        }
        val launch = packageManager.getLaunchIntentForPackage(packageName)
        val tap = launch?.let {
            PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(settings.notificationTitle)
            .setContentText(settings.notificationText)
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(tap)
            .build()
    }

    @Deprecated("Necesario en Android antiguos")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

    override fun onProviderEnabled(provider: String) {}

    override fun onProviderDisabled(provider: String) {
        if (provider == LocationManager.GPS_PROVIDER) LocationEvents.error("gps_disabled")
    }

    override fun onDestroy() {
        handler.removeCallbacks(heartbeat)
        manager?.removeUpdates(this)
        manager = null
        sender.shutdown()
        LocationEvents.state(false)
        super.onDestroy()
    }

    companion object {
        const val CHANNEL_ID = "smayta_location"
        const val NOTIFICATION_ID = 7301
        const val MAX_ACCURACY_METERS = 150f

        fun hasPermission(context: Context): Boolean =
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

        fun start(context: Context) {
            ContextCompat.startForegroundService(context, Intent(context, LocationService::class.java))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, LocationService::class.java))
        }
    }
}
