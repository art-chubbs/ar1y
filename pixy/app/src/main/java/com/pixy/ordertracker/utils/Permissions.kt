package com.pixy.ordertracker.utils

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.net.toUri
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.pixy.ordertracker.notifications.OrderListenerService

data class PermissionState(
    val notificationAccess: Boolean = false,
    val overlay: Boolean = false,
    val postNotifications: Boolean = false,
    val batteryUnrestricted: Boolean = false,
)

object Permissions {
    fun state(c: Context) = PermissionState(
        notificationAccess = NotificationManagerCompat.getEnabledListenerPackages(c).contains(c.packageName),
        overlay = Settings.canDrawOverlays(c),
        postNotifications = canPostNotifications(c),
        batteryUnrestricted = c.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(c.packageName),
    )

    /** Android 13+ asks at runtime; on Android 12 notifications are allowed unless switched off in Settings. */
    fun canPostNotifications(c: Context): Boolean {
        val enabled = NotificationManagerCompat.from(c).areNotificationsEnabled()
        if (Build.VERSION.SDK_INT < 33) return enabled
        return enabled && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    }

    /** Straight to this app's switch on the Notification access screen. */
    fun notificationAccessIntent(c: Context): Intent =
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
            .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, ComponentName(c, OrderListenerService::class.java).flattenToString())

    fun notificationAccessFallback() = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)

    fun overlayIntent(c: Context) = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, "package:${c.packageName}".toUri())

    /** App info page: on Samsung, Battery -> Unrestricted lives here, and so does "Allow restricted settings". */
    fun appDetailsIntent(c: Context) = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, "package:${c.packageName}".toUri())

    fun open(c: Context, primary: Intent, fallback: Intent? = null) {
        val flags = Intent.FLAG_ACTIVITY_NEW_TASK
        if (runCatching { c.startActivity(primary.addFlags(flags)) }.isFailure && fallback != null) {
            runCatching { c.startActivity(fallback.addFlags(flags)) }
        }
    }
}
