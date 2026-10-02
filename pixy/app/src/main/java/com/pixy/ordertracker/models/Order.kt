package com.pixy.ordertracker.models

/**
 * Minimal order state kept on device. Raw notification text is never stored here.
 *
 * @property sourceApp adapter id, e.g. "swiggy"
 * @property sourcePackage package that posted the notification (used to open the app)
 * @property statusText short human status derived from the parsed status (not the raw notification)
 * @property etaMinutes minutes remaining as stated by the delivery app at [etaCapturedAt]
 * @property estimatedDeliveryTime absolute ETA (epoch millis) when the app gave one, or computed from [etaMinutes]
 */
data class Order(
    val id: Long = 0,
    val sourceApp: String,
    val sourcePackage: String,
    val merchantName: String? = null,
    val orderTitle: String? = null,
    val status: OrderStatus = OrderStatus.UNKNOWN,
    val statusText: String = status.label,
    val etaMinutes: Int? = null,
    val etaCapturedAt: Long? = null,
    val estimatedDeliveryTime: Long? = null,
    val etaWindowStart: Long? = null,
    val riderName: String? = null,
    val notificationKey: String? = null,
    val createdAt: Long,
    val lastUpdatedAt: Long,
    val completedAt: Long? = null,
    /** Closed without a final status (went quiet for hours, or the user marked it done). */
    val archived: Boolean = false,
) {
    val isActive: Boolean get() = status.isActive && !archived
    val isDelivered: Boolean get() = status == OrderStatus.DELIVERED
    val isCancelled: Boolean get() = status == OrderStatus.CANCELLED || status == OrderStatus.FAILED

    /** Minutes left until [estimatedDeliveryTime] at [now], never negative; null when the app gave no ETA. */
    fun minutesLeft(now: Long): Int? {
        val due = estimatedDeliveryTime ?: return null
        val left = ((due - now) / 60_000.0)
        return if (left <= 0) 0 else kotlin.math.ceil(left).toInt()
    }
}
