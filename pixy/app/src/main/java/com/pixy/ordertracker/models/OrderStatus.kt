package com.pixy.ordertracker.models

/**
 * Standardised order lifecycle shared by every delivery app.
 * [rank] orders the active states so updates only ever move an order forward.
 */
enum class OrderStatus(val rank: Int, val isTerminal: Boolean, val label: String) {
    UNKNOWN(0, false, "Order in progress"),
    CONFIRMED(1, false, "Order confirmed"),
    PREPARING(2, false, "Preparing"),
    READY(3, false, "Ready"),
    PICKED_UP(4, false, "Picked up"),
    OUT_FOR_DELIVERY(5, false, "On the way"),
    ARRIVING(6, false, "Arriving"),
    DELIVERED(10, true, "Delivered"),
    CANCELLED(10, true, "Cancelled"),
    FAILED(10, true, "Failed");

    val isActive: Boolean get() = !isTerminal

    companion object {
        fun fromName(name: String?): OrderStatus = entries.firstOrNull { it.name == name } ?: UNKNOWN
    }
}
