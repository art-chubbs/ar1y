package com.pixy.ordertracker.notifications

import android.app.Notification
import android.service.notification.StatusBarNotification
import com.pixy.ordertracker.models.NotificationSnapshot

/**
 * Reads only the standard text fields. Apps that draw fully custom notification layouts
 * (RemoteViews) may expose little or no text here; Android offers no supported way to read those views.
 */
object SnapshotExtractor {
    fun from(sbn: StatusBarNotification): NotificationSnapshot {
        val n = sbn.notification
        val e = n.extras
        fun cs(key: String): String? = e.getCharSequence(key)?.toString()?.takeIf { it.isNotBlank() }
        return NotificationSnapshot(
            packageName = sbn.packageName,
            key = sbn.key,
            postTime = sbn.postTime,
            title = cs(Notification.EXTRA_TITLE_BIG) ?: cs(Notification.EXTRA_TITLE),
            text = cs(Notification.EXTRA_TEXT),
            bigText = cs(Notification.EXTRA_BIG_TEXT),
            subText = cs(Notification.EXTRA_SUB_TEXT),
            infoText = cs(Notification.EXTRA_INFO_TEXT),
            summaryText = cs(Notification.EXTRA_SUMMARY_TEXT),
            textLines = e.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.mapNotNull { it?.toString() } ?: emptyList(),
            tickerText = n.tickerText?.toString(),
            isOngoing = sbn.isOngoing,
            category = n.category,
            isGroupSummary = (n.flags and Notification.FLAG_GROUP_SUMMARY) != 0,
        )
    }
}
