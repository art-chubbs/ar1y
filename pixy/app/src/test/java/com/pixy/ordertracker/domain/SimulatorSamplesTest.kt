package com.pixy.ordertracker.domain

import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.parsers.AdapterRegistry
import com.pixy.ordertracker.parsers.Apps
import com.pixy.ordertracker.parsers.NOW
import com.pixy.ordertracker.parsers.NotificationParser
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Every test-mode sample must parse to the step it represents, for every built-in app. */
class SimulatorSamplesTest {
    private val parser = NotificationParser(AdapterRegistry())

    private fun parse(appId: String, pkg: String, step: Simulator.Step) = Simulator.sample(appId, step).let { s ->
        parser.parse(NotificationSnapshot(pkg, "sim:$appId", 0, s.title, s.text, isOngoing = s.ongoing && step < Simulator.Step.DELIVERED), NOW).result
    }

    @Test fun samplesParseToTheirStep() {
        for (app in Apps.builtIn) {
            val expect = mapOf(
                Simulator.Step.CONFIRMED to setOf(OrderStatus.CONFIRMED),
                Simulator.Step.PREPARING to setOf(OrderStatus.PREPARING),
                Simulator.Step.PICKED_UP to setOf(OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY),
                Simulator.Step.ARRIVING to setOf(OrderStatus.ARRIVING),
                Simulator.Step.DELIVERED to setOf(OrderStatus.DELIVERED),
                Simulator.Step.CANCELLED to setOf(OrderStatus.CANCELLED),
            )
            for ((step, ok) in expect) {
                val r = parse(app.id, app.launchPackage, step)
                assertEquals("${app.id} adapter for $step", app.id, r.adapterId)
                assertTrue("${app.id} $step parsed as ${r.status} (${r.reason})", r.status in ok)
            }
        }
    }

    @Test fun fullJourneyEndsTheOrder() = runTest {
        for (app in Apps.builtIn) {
            val store = FakeStore()
            val manager = OrderManager(store) { 0L }
            for (step in listOf(Simulator.Step.CONFIRMED, Simulator.Step.PREPARING, Simulator.Step.PICKED_UP, Simulator.Step.ARRIVING, Simulator.Step.DELIVERED)) {
                manager.apply(app, app.launchPackage, "sim:${app.id}", parse(app.id, app.launchPackage, step))
            }
            assertEquals(app.id, 1, store.orders.size)
            assertEquals(app.id, OrderStatus.DELIVERED, store.orders.single().status)
            assertFalse(store.orders.single().isActive)
        }
    }
}
