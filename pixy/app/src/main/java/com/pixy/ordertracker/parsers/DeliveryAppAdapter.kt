package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.ParseResult
import com.pixy.ordertracker.models.SourceApp
import java.time.ZonedDateTime

/**
 * One delivery service. Add a new service by implementing this (usually by extending
 * [RuleBasedAdapter]) and registering it in [AdapterRegistry]; nothing else changes.
 */
interface DeliveryAppAdapter {
    val app: SourceApp
    /** Packages whose notifications this adapter may read. */
    val packageNames: Set<String>
    /** Higher wins when two adapters can handle the same notification (Instamart inside the Swiggy app). */
    val priority: Int get() = 0

    /** Identification rule: is this notification for this service at all? */
    fun canHandle(snapshot: NotificationSnapshot): Boolean = snapshot.packageName in packageNames

    fun parse(snapshot: NotificationSnapshot, now: ZonedDateTime): ParseResult
}
