package com.pixy.ordertracker.android

import android.provider.Settings
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pixy.ordertracker.PixyApp
import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.overlay.IslandMode
import com.pixy.ordertracker.parsers.Apps
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper
import org.robolectric.shadows.ShadowSettings

/**
 * End to end on the real app graph: notification snapshot -> parser -> state machine -> Room -> overlay window.
 */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [36], application = PixyApp::class)
class PipelineTest {
    private val app = ApplicationProvider.getApplicationContext<PixyApp>()

    private fun post(title: String, text: String, pkg: String = Apps.SWIGGY_PKG, key: String = "swiggy-1") =
        app.engine.onSnapshot(NotificationSnapshot(pkg, key, System.currentTimeMillis(), title, text, isOngoing = true), null)

    private fun <T> waitFor(what: String, block: suspend () -> T?): T = runBlocking {
        withTimeout(10_000) {
            var v: T? = null
            while (v == null) {
                ShadowLooper.idleMainLooper()
                v = block()
                if (v == null) kotlinx.coroutines.delay(20)
            }
            v
        }
    }

    private fun overlayViews(): Int = if (app.overlay.windowAttached) 1 else 0

    @Test fun notificationBecomesTrackedOrderAndPill() {
        ShadowSettings.setCanDrawOverlays(true)

        post("Order confirmed!", "Your order from Paradise Biryani has been confirmed. Arriving in 35 mins")
        val created = waitFor("created") { app.orders.activeOrders.first().firstOrNull() }
        assertEquals(OrderStatus.CONFIRMED, created.status)
        assertEquals("Paradise Biryani", created.merchantName)

        // The pill becomes visible and peeks for the new order.
        val ui = waitFor("pill") { app.overlay.ui.value.takeIf { it.visible && it.items.isNotEmpty() } }
        assertEquals(IslandMode.PEEK, ui.mode)
        assertEquals("Swiggy", ui.items.single().appName)
        assertTrue("overlay window attached", overlayViews() >= 1)

        // Second app at the same time.
        post("Order confirmed", "Your order of 8 items is confirmed. Delivery in 16 minutes", pkg = Apps.BLINKIT_PKG, key = "blinkit-1")
        waitFor("two") { app.overlay.ui.value.items.takeIf { it.size == 2 } }

        // Status moves forward; a late "preparing" does not move it back.
        post("Ramesh has picked up your order", "Arriving in 14 mins")
        waitFor("picked up") { app.orders.activeOrders.first().firstOrNull { it.sourceApp == "swiggy" && it.status == OrderStatus.PICKED_UP } }
        post("Paradise Biryani is preparing your order", "")
        Thread.sleep(200)
        assertEquals(OrderStatus.PICKED_UP, waitFor("still") { app.orders.activeOrders.first().firstOrNull { it.sourceApp == "swiggy" } }.status)

        // Delivered: leaves the active list and shows the finale.
        post("Order delivered", "Enjoy your meal!")
        waitFor("delivered") { app.orders.activeOrders.first().takeIf { list -> list.none { it.sourceApp == "swiggy" } } }
        val finale = waitFor("finale") { app.overlay.ui.value.finale }
        assertEquals(OrderStatus.DELIVERED, finale.status)

        // Promotions never create orders.
        post("Hungry? 😋", "Get 50% OFF on Biryani. Order now!", key = "promo")
        Thread.sleep(200)
        assertEquals(1, runBlocking { app.orders.activeOrders.first().size })
    }

    @Test fun tapExpandsSwipeHidesNextUpdateReturns() {
        ShadowSettings.setCanDrawOverlays(true)
        post("Order accepted", "Your order from Behrouz Biryani has been accepted", pkg = Apps.ZOMATO_PKG, key = "z-1")
        waitFor("visible") { app.overlay.ui.value.takeIf { it.visible && it.items.isNotEmpty() } }

        app.overlay.onTap()
        assertEquals(IslandMode.EXPANDED, app.overlay.ui.value.mode)
        app.overlay.onCollapse()
        assertEquals(IslandMode.COMPACT, app.overlay.ui.value.mode)

        app.overlay.onDismiss()                       // swipe up
        ShadowLooper.idleMainLooper()
        assertFalse(app.overlay.ui.value.visible)
        assertEquals(1, runBlocking { app.orders.activeOrders.first().size })   // order kept

        Thread.sleep(5)                                // next update has a later timestamp
        post("Arjun has picked up your order", "Arriving in 16 mins", pkg = Apps.ZOMATO_PKG, key = "z-1")
        waitFor("back") { app.overlay.ui.value.takeIf { it.visible } }
    }

    @Test fun noOverlayPermissionMeansNoWindow() {
        ShadowSettings.setCanDrawOverlays(false)
        post("Order confirmed!", "Your order from Meghana Foods has been confirmed", key = "swiggy-2")
        waitFor("created") { app.orders.activeOrders.first().firstOrNull() }
        ShadowLooper.idleMainLooper()
        assertFalse(app.overlay.ui.value.visible)
        assertEquals(0, overlayViews())
        assertFalse(Settings.canDrawOverlays(app))
    }
}
