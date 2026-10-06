package com.pixy.ordertracker.domain

import com.pixy.ordertracker.models.Eta
import com.pixy.ordertracker.models.Order
import com.pixy.ordertracker.models.OrderStatus.*
import com.pixy.ordertracker.models.ParseResult
import com.pixy.ordertracker.parsers.Apps
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeStore : OrderStore {
    val orders = mutableListOf<Order>()
    private var next = 1L
    override suspend fun activeOrders() = orders.filter { it.isActive }
    override suspend fun insert(order: Order): Long { val o = order.copy(id = next++); orders += o; return o.id }
    override suspend fun update(order: Order) { orders.replaceAll { if (it.id == order.id) order else it } }
    override suspend fun lastFinished(sourceApp: String) = orders.filter { !it.isActive && it.sourceApp == sourceApp }.maxByOrNull { it.completedAt ?: 0 }
}

class OrderManagerTest {
    private var clock = 1_000_000L
    private val store = FakeStore()
    private val manager = OrderManager(store) { clock }

    private fun r(status: com.pixy.ordertracker.models.OrderStatus, eta: Int? = null, merchant: String? = null, context: Boolean = true, adapter: String = "swiggy") =
        ParseResult(adapter, true, status, eta?.let { Eta(it, clock + it * 60_000L) } ?: Eta(), merchantName = merchant, hasOrderContext = context)

    @Test fun fullLifecycle() = runTest {
        val a = manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n1", r(CONFIRMED, merchant = "Paradise"))!!
        assertEquals(OrderManager.Change.NEW, a.change)
        clock += 60_000
        assertEquals(PREPARING, manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n1", r(PREPARING))!!.order.status)
        clock += 60_000
        val p = manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n1", r(PICKED_UP, eta = 14))!!
        assertEquals(OrderManager.Change.STATUS, p.change)
        assertEquals(14, p.order.etaMinutes)
        assertEquals("Paradise", p.order.merchantName)
        clock += 60_000
        val e = manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n1", r(UNKNOWN, eta = 9))!!
        assertEquals(OrderManager.Change.ETA, e.change)
        assertEquals(PICKED_UP, e.order.status)
        val d = manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n1", r(DELIVERED))!!
        assertEquals(DELIVERED, d.order.status)
        assertFalse(d.order.isActive)
        assertNull(d.order.estimatedDeliveryTime)
        assertEquals(1, store.orders.size)
    }

    @Test fun statusNeverMovesBackwards() = runTest {
        manager.apply(Apps.ZOMATO, Apps.ZOMATO_PKG, "z", r(OUT_FOR_DELIVERY, adapter = "zomato"))
        val late = manager.apply(Apps.ZOMATO, Apps.ZOMATO_PKG, "z", r(PREPARING, adapter = "zomato"))!!
        assertEquals(OUT_FOR_DELIVERY, late.order.status)
        assertEquals(OrderManager.Change.NONE, late.change)
    }

    @Test fun finalStatusWithoutActiveOrderIsIgnored() = runTest {
        assertNull(manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "x", r(DELIVERED)))
        assertTrue(store.orders.isEmpty())
    }

    @Test fun weakContextDoesNotStartAnOrder() = runTest {
        assertNull(manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "x", r(PREPARING, context = false)))
    }

    @Test fun unknownWithoutEtaDoesNotStartAnOrder() = runTest {
        assertNull(manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "x", r(UNKNOWN)))
        assertTrue(manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "x", r(UNKNOWN, eta = 20)) != null)
    }

    @Test fun ordersFromDifferentAppsAreSeparate() = runTest {
        manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "s", r(PICKED_UP, eta = 12))
        manager.apply(Apps.BLINKIT, Apps.BLINKIT_PKG, "b", r(PREPARING, eta = 24, adapter = "blinkit"))
        assertEquals(2, store.activeOrders().size)
        manager.apply(Apps.BLINKIT, Apps.BLINKIT_PKG, "b", r(DELIVERED, adapter = "blinkit"))
        assertEquals(listOf("swiggy"), store.activeOrders().map { it.sourceApp })
    }

    @Test fun cancellationEndsFromAnyState() = runTest {
        manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "s", r(CONFIRMED))
        assertEquals(CANCELLED, manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "s", r(CANCELLED))!!.order.status)
        assertTrue(store.activeOrders().isEmpty())
    }

    @Test fun secondOrderFromSameAppIsDetected() = runTest {
        manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "first", r(PICKED_UP, merchant = "Paradise"))
        clock += 15 * 60_000
        val second = manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "second", r(CONFIRMED, merchant = "Meghana Foods"))!!
        assertEquals(OrderManager.Change.NEW, second.change)
        assertEquals(2, store.activeOrders().size)
    }

    @Test fun staleOrdersAreArchived() = runTest {
        manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "s", r(PREPARING))
        clock += 4 * OrderManager.HOUR
        assertEquals(1, manager.archiveStale().size)
        assertTrue(store.activeOrders().isEmpty())
        assertEquals(PREPARING, store.orders.single().status)
    }

    @Test fun transitionTable() {
        assertEquals(PICKED_UP, OrderManager.nextStatus(PREPARING, PICKED_UP))
        assertEquals(PICKED_UP, OrderManager.nextStatus(PICKED_UP, CONFIRMED))
        assertEquals(CANCELLED, OrderManager.nextStatus(ARRIVING, CANCELLED))
        assertEquals(DELIVERED, OrderManager.nextStatus(DELIVERED, PREPARING))
        assertEquals(CONFIRMED, OrderManager.nextStatus(UNKNOWN, CONFIRMED))
    }

    @Test fun leftoverNotificationFromAFinishedOrderDoesNotStartANewOne() = runTest {
        val postedEarlier = clock
        manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n1", r(PICKED_UP, eta = 14), postedAt = clock)
        clock += 20 * 60_000
        manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n2", r(DELIVERED), postedAt = clock)
        clock += 60_000
        // After a restart the listener re-reads the old "picked up" notification still in the shade.
        assertNull(manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n1", r(PICKED_UP, eta = 14), postedAt = postedEarlier))
        assertTrue(store.activeOrders().isEmpty())
        // A genuinely new order afterwards is still tracked.
        clock += 60_000
        assertEquals(OrderManager.Change.NEW, manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n3", r(CONFIRMED), postedAt = clock)!!.change)
    }

    @Test fun notificationOlderThanTheLastUpdateIsIgnored() = runTest {
        val first = clock
        manager.apply(Apps.ZOMATO, Apps.ZOMATO_PKG, "z", r(PREPARING, eta = 30, adapter = "zomato"), postedAt = first)
        clock += 5 * 60_000
        manager.apply(Apps.ZOMATO, Apps.ZOMATO_PKG, "z", r(PICKED_UP, eta = 12, adapter = "zomato"), postedAt = clock)
        val due = store.activeOrders().single().estimatedDeliveryTime
        assertNull(manager.apply(Apps.ZOMATO, Apps.ZOMATO_PKG, "z", r(PREPARING, eta = 30, adapter = "zomato"), postedAt = first))
        assertEquals(due, store.activeOrders().single().estimatedDeliveryTime)
    }

    @Test fun updateTimeIsWhenTheAppPostedIt() = runTest {
        val posted = clock - 4 * 60_000
        val o = manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n", r(PICKED_UP), postedAt = posted)!!.order
        assertEquals(posted, o.lastUpdatedAt)
        // A post time in the future (clock skew) is capped at now.
        val later = manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "n", r(ARRIVING), postedAt = clock + HOUR)!!.order
        assertEquals(clock, later.lastUpdatedAt)
    }

    @Test fun appRemovingItsTrackerClosesALateStageOrderWithoutCallingItDelivered() = runTest {
        manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "live", r(ARRIVING, eta = 2), postedAt = clock)
        clock += 60_000
        val closed = manager.trackerRemoved("live", removedAt = clock)!!
        assertTrue(closed.archived)
        assertEquals(ARRIVING, closed.status)
        assertFalse(closed.isDelivered)
        assertTrue(store.activeOrders().isEmpty())
    }

    @Test fun appRemovingItsTrackerEarlyOrBeforeANewerUpdateKeepsTheOrder() = runTest {
        manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "early", r(PREPARING, eta = 30), postedAt = clock)
        assertNull(manager.trackerRemoved("early", removedAt = clock + 1))           // not picked up yet: apps re-post later
        manager.apply(Apps.BLINKIT, Apps.BLINKIT_PKG, "b", r(PICKED_UP, adapter = "blinkit"), postedAt = clock)
        val removedAt = clock
        clock += 30_000
        manager.apply(Apps.BLINKIT, Apps.BLINKIT_PKG, "b", r(ARRIVING, adapter = "blinkit"), postedAt = clock)
        assertNull(manager.trackerRemoved("b", removedAt))                            // an update arrived after the removal
        assertNull(manager.trackerRemoved("unknown-key", clock))
        assertEquals(2, store.activeOrders().size)
    }

    @Test fun manualTrackingStartsAnOrderFromUnrecognisedWording() = runTest {
        val ignored = ParseResult.ignored("swiggy", "no order wording")
        assertNull(manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "m", ignored))
        val o = manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "m", ignored, manual = true)!!.order
        assertEquals(UNKNOWN, o.status)
        assertTrue(o.isActive)
        // Still never starts from a final status.
        assertNull(manager.apply(Apps.ZOMATO, Apps.ZOMATO_PKG, "z", r(DELIVERED, adapter = "zomato"), manual = true))
    }

    private companion object { const val HOUR = 60 * 60_000L }
}
