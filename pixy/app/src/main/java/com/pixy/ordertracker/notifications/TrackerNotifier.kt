package com.pixy.ordertracker.notifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.core.graphics.toColorInt
import android.os.Build
import com.pixy.ordertracker.R
import com.pixy.ordertracker.models.Order
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.settings.AppSettings
import com.pixy.ordertracker.utils.AppIdentity
import com.pixy.ordertracker.utils.Formatters
import com.pixy.ordertracker.utils.Permissions

/**
 * Optional "order notifications": one quiet ongoing notification per active order.
 * On Android 16 it uses ProgressStyle and requests Live Update promotion (honoured from Android 16 QPR2, API 36.1),
 * which the system may show as a status-bar chip / on the lock screen. Whether One UI surfaces third-party
 * Live Updates in its Now Bar is Samsung's decision; on devices that don't promote it, it is a normal
 * silent notification. Off by default because the delivery apps already notify.
 */
class TrackerNotifier(private val context: Context) {
    private val nm = context.getSystemService(NotificationManager::class.java)
    private val posted = mutableSetOf<Int>()

    fun canPost(): Boolean = Permissions.canPostNotifications(context)

    @Synchronized
    fun sync(active: List<Order>, settings: AppSettings) {
        val wanted = if (settings.liveNotificationEnabled && canPost()) active else emptyList()
        if (wanted.isNotEmpty()) ensureChannel()
        val ids = wanted.map { notificationId(it) }.toSet()
        (posted - ids).forEach { nm.cancel(it) }
        posted.retainAll(ids)
        val now = System.currentTimeMillis()
        wanted.forEach { o ->
            runCatching { nm.notify(notificationId(o), build(o, settings, now)) }.onSuccess { posted += notificationId(o) }
        }
    }

    private fun build(o: Order, s: AppSettings, now: Long): Notification {
        val name = AppIdentity.of(context, o.sourceApp).displayName
        val eta = if (s.showEta) Formatters.etaShort(o, now) else null
        val title = listOfNotNull(name, o.merchantName).joinToString(" · ")
        val text = listOfNotNull(Formatters.statusLine(o), eta?.let { "~$it" }).joinToString(" · ")
        val launch = context.packageManager.getLaunchIntentForPackage(o.sourcePackage)?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val b = Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_order)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setCategory(Notification.CATEGORY_PROGRESS)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
        launch?.let { b.setContentIntent(PendingIntent.getActivity(context, notificationId(o), it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)) }
        if (Build.VERSION.SDK_INT >= 36) {
            val step = progressStep(o.status)
            b.setStyle(
                Notification.ProgressStyle()
                    .setStyledByProgress(true)
                    .setProgress(step)
                    .setProgressSegments(listOf(Notification.ProgressStyle.Segment(100).setColor("#3EAF75".toColorInt())))
            )
            // Ask for Live Update promotion. The platform promotes only from API 36.1 (Android 16 QPR2); on earlier
            // Android 16 builds the extra is ignored and this stays a normal quiet ongoing notification.
            // (Builder.setRequestPromotedOngoing() would crash below 36.1; the extra is safe everywhere.)
            @Suppress("InlinedApi")
            b.addExtras(Bundle().apply { putBoolean(Notification.EXTRA_REQUEST_PROMOTED_ONGOING, true) })
            eta?.let { b.setShortCriticalText(it) }
        }
        return b.build()
    }

    private fun progressStep(s: OrderStatus): Int = when (s) {
        OrderStatus.UNKNOWN, OrderStatus.CONFIRMED -> 10
        OrderStatus.PREPARING -> 30
        OrderStatus.READY -> 45
        OrderStatus.PICKED_UP -> 60
        OrderStatus.OUT_FOR_DELIVERY -> 75
        OrderStatus.ARRIVING -> 90
        else -> 100
    }

    private fun ensureChannel() {
        if (nm.getNotificationChannel(CHANNEL) != null) return
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Live order tracker", NotificationManager.IMPORTANCE_LOW).apply {
            description = "A quiet, ongoing notification for each active order"
            setShowBadge(false)
        })
    }

    private fun notificationId(o: Order) = 1000 + (o.id % 100_000).toInt()

    companion object { const val CHANNEL = "live_orders" }
}
