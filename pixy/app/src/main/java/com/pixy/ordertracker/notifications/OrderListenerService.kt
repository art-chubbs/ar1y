package com.pixy.ordertracker.notifications

import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.pixy.ordertracker.app
import com.pixy.ordertracker.utils.DebugLog

/**
 * Receives posted notifications. Anything not from an enabled delivery app is dropped
 * before its text is read. The system keeps this service bound while access is granted,
 * so no foreground service or wake lock is needed.
 */
class OrderListenerService : NotificationListenerService() {

    override fun onListenerConnected() {
        app.engine.setListenerConnected(true)
        // Pick up trackers that were already showing (e.g. after a reboot or app update),
        // but not leftovers from hours ago that would resurrect a finished order.
        val cutoff = System.currentTimeMillis() - STALE_MS
        runCatching { activeNotifications }.getOrNull()?.filter { it.postTime >= cutoff }?.forEach(::handle)
    }

    override fun onListenerDisconnected() {
        app.engine.setListenerConnected(false)
        runCatching { requestRebind(ComponentName(this, OrderListenerService::class.java)) }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) = handle(sbn)

    override fun onNotificationRemoved(sbn: StatusBarNotification, rankingMap: RankingMap, reason: Int) {
        try {
            // Only the app itself withdrawing its live tracker is a signal; a user swipe or tap is not.
            if (reason != REASON_APP_CANCEL && reason != REASON_APP_CANCEL_ALL) return
            if (!sbn.isOngoing || !app.engine.watches(sbn.packageName)) return
            app.engine.onTrackerRemoved(sbn.key)
        } catch (t: Throwable) {
            DebugLog.w("listener", "could not handle removal", t)
        }
    }

    private companion object { const val STALE_MS = 3 * 60 * 60 * 1000L }

    private fun handle(sbn: StatusBarNotification) {
        try {
            if (sbn.packageName == packageName) return
            if (!app.engine.watches(sbn.packageName)) return
            app.engine.onSnapshot(SnapshotExtractor.from(sbn), sbn.notification.contentIntent)
        } catch (t: Throwable) {
            DebugLog.w("listener", "could not read notification", t)   // never crash the listener
        }
    }
}
