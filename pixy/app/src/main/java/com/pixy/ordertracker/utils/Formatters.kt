package com.pixy.ordertracker.utils

import android.text.format.DateUtils
import com.pixy.ordertracker.models.Order
import com.pixy.ordertracker.models.OrderStatus
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

object Formatters {
    private val clock = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH)

    fun time(ms: Long): String = clock.format(Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault()))

    /** "12 min" while the app's ETA is in the future; null when the app gave none or it has passed. */
    fun etaShort(o: Order, now: Long): String? {
        if (!o.isActive) return null
        val left = o.minutesLeft(now) ?: return null
        if (left <= 0) return null
        return if (left >= 90) "by ${time(o.estimatedDeliveryTime!!)}" else "$left min"
    }

    /** Longer ETA line for the expanded card. */
    fun etaLong(o: Order, now: Long): String? {
        if (!o.isActive) return null
        val due = o.estimatedDeliveryTime ?: return null
        o.etaWindowStart?.let { start -> return "Slot ${time(start)} – ${time(due)}" }
        val left = o.minutesLeft(now) ?: return null
        return when {
            left <= 0 -> "Was due ${time(due)}"
            left >= 90 -> "Arriving by ${time(due)}"
            else -> "Arriving in ~$left min"
        }
    }

    fun statusLine(o: Order): String = when {
        o.archived && o.status.isActive -> "No further updates"
        o.status == OrderStatus.PICKED_UP && o.riderName != null -> "${o.riderName} picked up your order"
        o.status == OrderStatus.OUT_FOR_DELIVERY && o.riderName != null -> "${o.riderName} is on the way"
        o.status == OrderStatus.ARRIVING && o.riderName != null -> "${o.riderName} is arriving"
        else -> o.status.label
    }

    fun relative(ms: Long, now: Long = System.currentTimeMillis()): String =
        if (now - ms < 60_000) "just now" else DateUtils.getRelativeTimeSpanString(ms, now, DateUtils.MINUTE_IN_MILLIS).toString()
}
