package com.pixy.ordertracker.models

/** ETA as stated by the delivery app. Never invented: all fields are null when the text has no ETA. */
data class Eta(
    val minutes: Int? = null,
    val at: Long? = null,          // epoch millis of the stated arrival time (or end of a slot)
    val windowStart: Long? = null, // start of a delivery slot, when one was given
) {
    val isEmpty: Boolean get() = minutes == null && at == null
}

data class ParseResult(
    val adapterId: String,
    val isOrderRelated: Boolean,
    val status: OrderStatus = OrderStatus.UNKNOWN,
    val eta: Eta = Eta(),
    val merchantName: String? = null,
    val orderTitle: String? = null,
    val riderName: String? = null,
    /** True when the text clearly refers to a specific order ("your order", rider, order #, ongoing tracker). */
    val hasOrderContext: Boolean = false,
    /** Why the parser decided what it did (shown on the debug screen). */
    val reason: String = "",
) {
    companion object {
        fun ignored(adapterId: String, reason: String) = ParseResult(adapterId, isOrderRelated = false, reason = reason)
    }
}
