package com.pixy.ordertracker.android

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pixy.ordertracker.data.AppDatabase
import com.pixy.ordertracker.data.OrderRepository
import com.pixy.ordertracker.domain.OrderManager
import com.pixy.ordertracker.models.Eta
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.models.ParseResult
import com.pixy.ordertracker.parsers.Apps
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

/** The real Room database behind the state machine. */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [36])
class OrderRepositoryTest {
    private val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), AppDatabase::class.java).allowMainThreadQueries().build()
    private val repo = OrderRepository(db.orders())
    private var clock = 1_000_000L
    private val manager = OrderManager(repo) { clock }

    @After fun close() = db.close()

    private fun r(s: OrderStatus, eta: Int? = null, adapter: String = "swiggy") =
        ParseResult(adapter, true, s, eta?.let { Eta(it, clock + it * 60_000L) } ?: Eta(), merchantName = "Paradise", riderName = "Ramesh", hasOrderContext = true)

    @Test fun persistsLifecycleAndHistory() = runBlocking {
        manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "k", r(OrderStatus.PICKED_UP, eta = 12))
        manager.apply(Apps.BLINKIT, Apps.BLINKIT_PKG, "b", r(OrderStatus.PREPARING, adapter = "blinkit"))
        val active = repo.activeOrders.first()
        assertEquals(2, active.size)
        val swiggy = active.first { it.sourceApp == "swiggy" }
        assertEquals(OrderStatus.PICKED_UP, swiggy.status)
        assertEquals("Ramesh", swiggy.riderName)
        assertEquals(12, swiggy.minutesLeft(clock))

        clock += 60_000
        manager.apply(Apps.SWIGGY, Apps.SWIGGY_PKG, "k", r(OrderStatus.DELIVERED))
        assertEquals(listOf("blinkit"), repo.activeOrders.first().map { it.sourceApp })
        val recent = repo.recentOrders().first()
        assertEquals(OrderStatus.DELIVERED, recent.single().status)
        assertTrue(recent.single().completedAt != null)

        repo.clearHistory()
        assertTrue(repo.recentOrders().first().isEmpty())
        assertEquals(1, repo.activeOrders.first().size)
        repo.clearAll()
        assertTrue(repo.activeOrders.first().isEmpty())
    }
}
