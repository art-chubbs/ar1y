package com.pixy.ordertracker.android

import android.app.Notification
import android.os.Process
import android.service.notification.StatusBarNotification
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pixy.ordertracker.notifications.SnapshotExtractor
import com.pixy.ordertracker.parsers.Apps
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

/** Reads a real platform Notification the way the listener does. */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [36])
class SnapshotExtractorTest {
    private val ctx = ApplicationProvider.getApplicationContext<android.content.Context>()

    @Suppress("DEPRECATION")
    private fun sbn(n: Notification, pkg: String = Apps.SWIGGY_PKG) =
        StatusBarNotification(pkg, pkg, 7, "tag", 1000, 0, 0, n, Process.myUserHandle(), 42L)

    @Test fun readsBigTextAndOngoing() {
        val n = Notification.Builder(ctx, "c")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Ramesh has picked up your order")
            .setContentText("Arriving in 14 mins")
            .setStyle(Notification.BigTextStyle().bigText("Ramesh has picked up your order from Paradise Biryani. Arriving in 14 mins"))
            .setOngoing(true)
            .build()
        val s = SnapshotExtractor.from(sbn(n))
        assertEquals(Apps.SWIGGY_PKG, s.packageName)
        assertEquals("Ramesh has picked up your order", s.title)
        assertEquals("Arriving in 14 mins", s.text)
        assertTrue(s.bigText!!.contains("Paradise Biryani"))
        assertTrue(s.isOngoing)
        assertTrue(s.combinedText.contains("Paradise Biryani"))
    }

    @Test fun readsInboxLinesAndGroupSummary() {
        val n = Notification.Builder(ctx, "c")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("2 updates")
            .setStyle(Notification.InboxStyle().addLine("Order packed").addLine("Arriving in 8 minutes"))
            .setGroup("g").setGroupSummary(true)
            .build()
        val s = SnapshotExtractor.from(sbn(n, Apps.BLINKIT_PKG))
        assertEquals(listOf("Order packed", "Arriving in 8 minutes"), s.textLines)
        assertTrue(s.isGroupSummary)
    }
}
