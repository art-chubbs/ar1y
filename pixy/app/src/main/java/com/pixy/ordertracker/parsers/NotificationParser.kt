package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.ParseResult
import java.time.ZonedDateTime

/** Entry point of the parsing layer: picks the adapter and never throws. */
class NotificationParser(private val registry: AdapterRegistry) {

    data class Outcome(val adapter: DeliveryAppAdapter?, val result: ParseResult)

    fun parse(snapshot: NotificationSnapshot, now: ZonedDateTime = ZonedDateTime.now()): Outcome {
        val adapter = registry.adapterFor(snapshot)
            ?: return Outcome(null, ParseResult.ignored("none", "no enabled adapter for ${snapshot.packageName}"))
        return try {
            Outcome(adapter, adapter.parse(snapshot, now))
        } catch (t: Throwable) {
            // A parser bug must never take the app down: classify as UNKNOWN and keep going.
            Outcome(adapter, ParseResult.ignored(adapter.app.id, "parser error: ${t.javaClass.simpleName}"))
        }
    }
}
