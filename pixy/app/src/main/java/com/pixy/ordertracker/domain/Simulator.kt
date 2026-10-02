package com.pixy.ordertracker.domain

import com.pixy.ordertracker.PixyApp
import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.SourceApp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Test mode: posts realistic sample notifications through the real parser and state machine,
 * so the pill can be tested without placing orders. Test orders use "sim:" notification keys.
 */
class Simulator(private val app: PixyApp) {

    enum class Step(val label: String) { CONFIRMED("Confirmed"), PREPARING("Preparing"), PICKED_UP("Picked up"), ARRIVING("Arriving"), DELIVERED("Delivered"), CANCELLED("Cancelled") }

    data class Sample(val title: String, val text: String, val ongoing: Boolean = true)

    private var running: Job? = null

    fun post(source: SourceApp, step: Step) {
        val s = sample(source.id, step)
        val snapshot = NotificationSnapshot(
            packageName = source.launchPackage, key = "sim:${source.id}", postTime = System.currentTimeMillis(),
            title = s.title, text = s.text, isOngoing = s.ongoing && step != Step.DELIVERED && step != Step.CANCELLED,
        )
        app.engine.onSnapshot(snapshot, contentIntent = null, simulated = true)
    }

    /** Plays confirmed -> delivered with a few seconds between steps. */
    fun playJourney(vararg sources: SourceApp, gapMs: Long = 3500) {
        running?.cancel()
        running = app.appScope.launch {
            val steps = listOf(Step.CONFIRMED, Step.PREPARING, Step.PICKED_UP, Step.ARRIVING, Step.DELIVERED)
            // Each extra order starts one step behind the previous one, so their updates interleave.
            for (tick in 0 until steps.size + sources.size - 1) {
                sources.forEachIndexed { j, s ->
                    steps.getOrNull(tick - j)?.let { post(s, it); delay(300) }
                }
                delay(gapMs)
            }
        }
    }

    fun stop() { running?.cancel() }

    companion object {
        fun sample(appId: String, step: Step): Sample = when (appId) {
            "swiggy" -> when (step) {
                Step.CONFIRMED -> Sample("Order confirmed! 🎉", "Your order from Paradise Biryani has been confirmed. Arriving in 35 mins")
                Step.PREPARING -> Sample("Paradise Biryani is preparing your order", "Arriving in 28 mins")
                Step.PICKED_UP -> Sample("Ramesh has picked up your order 🛵", "Arriving in 14 mins")
                Step.ARRIVING -> Sample("Almost there!", "Ramesh is arriving in 3 minutes")
                Step.DELIVERED -> Sample("Order delivered", "Enjoy your meal! 😋", ongoing = false)
                Step.CANCELLED -> Sample("Order cancelled", "Your order from Paradise Biryani has been cancelled. Refund initiated.", ongoing = false)
            }
            "zomato" -> when (step) {
                Step.CONFIRMED -> Sample("Order accepted", "Your order from Behrouz Biryani has been accepted")
                Step.PREPARING -> Sample("Behrouz Biryani is preparing your order", "Your order will arrive in 32 mins")
                Step.PICKED_UP -> Sample("Arjun has picked up your order", "Arriving in 16 mins")
                Step.ARRIVING -> Sample("Your order is arriving", "Arjun is nearby, arriving in 2 mins")
                Step.DELIVERED -> Sample("Order delivered!", "Hope you enjoy your meal", ongoing = false)
                Step.CANCELLED -> Sample("Order cancelled", "Your order has been cancelled by the restaurant. Refund initiated.", ongoing = false)
            }
            "blinkit" -> when (step) {
                Step.CONFIRMED -> Sample("Order confirmed", "Your order of 8 items is confirmed. Delivery in 16 minutes")
                Step.PREPARING -> Sample("Packing your order", "Your order is being packed. Arriving in 13 minutes")
                Step.PICKED_UP -> Sample("Order picked up", "Your delivery partner Vikram has picked up your order")
                Step.ARRIVING -> Sample("Arriving in 4 minutes", "Vikram is nearby")
                Step.DELIVERED -> Sample("Delivered in 11 minutes!", "Hope you enjoy your order", ongoing = false)
                Step.CANCELLED -> Sample("Order cancelled", "Your order has been cancelled. Refund initiated.", ongoing = false)
            }
            "bigbasket" -> when (step) {
                Step.CONFIRMED -> Sample("Order placed", "Your bigbasket order of 14 items is confirmed. Delivery by 9:30 PM")
                Step.PREPARING -> Sample("Packing in progress", "Your order is being packed")
                Step.PICKED_UP -> Sample("Order dispatched", "Your order has been dispatched and is on its way")
                Step.ARRIVING -> Sample("Arriving soon", "Your delivery partner is nearby")
                Step.DELIVERED -> Sample("Order delivered", "Your bigbasket order has been delivered", ongoing = false)
                Step.CANCELLED -> Sample("Order cancelled", "Your order has been cancelled. Refund will be processed.", ongoing = false)
            }
            "instamart" -> when (step) {
                Step.CONFIRMED -> Sample("Order placed", "Your Instamart order of 6 items is confirmed")
                Step.PREPARING -> Sample("Packing your items", "Your order is being packed")
                Step.PICKED_UP -> Sample("Order picked up", "Your order has been picked up, arriving in 14 mins")
                Step.ARRIVING -> Sample("Arriving in 2 mins", "Your delivery partner is nearby")
                Step.DELIVERED -> Sample("Delivered", "Your Instamart order has been delivered", ongoing = false)
                Step.CANCELLED -> Sample("Order cancelled", "Your Instamart order has been cancelled", ongoing = false)
            }
            else -> when (step) {
                Step.CONFIRMED -> Sample("Order confirmed", "Your order has been confirmed")
                Step.PREPARING -> Sample("Preparing your order", "Your order is being prepared")
                Step.PICKED_UP -> Sample("Order picked up", "Your order has been picked up, arriving in 20 mins")
                Step.ARRIVING -> Sample("Arriving", "Your order is arriving in 5 minutes")
                Step.DELIVERED -> Sample("Order delivered", "Your order has been delivered", ongoing = false)
                Step.CANCELLED -> Sample("Order cancelled", "Your order has been cancelled", ongoing = false)
            }
        }
    }
}
