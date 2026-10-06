package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.ParseResult
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

/** Entry point of the parsing layer: picks the adapter and never throws. */
class NotificationParser(private val registry: AdapterRegistry) {

    data class Outcome(val adapter: DeliveryAppAdapter?, val result: ParseResult)

    /**
     * [now] defaults to when the notification was posted, so "arriving in 14 mins" means 14 minutes after the app said it,
     * even when the notification is read later (e.g. re-read from the shade after a reboot).
     */
    fun parse(snapshot: NotificationSnapshot, now: ZonedDateTime = postedAt(snapshot)): Outcome {
        val adapter = registry.adapterFor(snapshot)
            ?: return Outcome(null, ParseResult.ignored("none", "no enabled adapter for ${snapshot.packageName}"))
        return try {
            Outcome(adapter, adapter.parse(snapshot, now))
        } catch (t: Throwable) {
            // A parser bug must never take the app down: classify as UNKNOWN and keep going.
            Outcome(adapter, ParseResult.ignored(adapter.app.id, "parser error: ${t.javaClass.simpleName}"))
        }
    }

    private fun postedAt(s: NotificationSnapshot): ZonedDateTime {
        val wall = System.currentTimeMillis()
        val at = if (s.postTime in 1..wall) s.postTime else wall
        return ZonedDateTime.ofInstant(Instant.ofEpochMilli(at), ZoneId.systemDefault())
    }
}
