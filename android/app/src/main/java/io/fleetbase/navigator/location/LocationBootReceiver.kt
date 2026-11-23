// Smayta Transporte: GPS en segundo plano propio y libre.
package io.fleetbase.navigator.location

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * Tras reiniciar el teléfono vuelve a seguir al conductor si estaba en servicio.
 * Android solo lo permite con «Permitir siempre» la ubicación; si no, sigue al abrir la app.
 */
class LocationBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val settings = LocationSettings(context)
        if (!settings.enabled || !settings.startOnBoot || !LocationService.hasPermission(context)) return
        val background = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!background) return
        try {
            LocationService.start(context)
        } catch (e: Exception) {
            // Android no lo permite ahora: seguirá al abrir la app.
        }
    }
}
