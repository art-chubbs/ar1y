package com.pixy.ordertracker.domain

import com.pixy.ordertracker.models.Order
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.models.ParseResult
import com.pixy.ordertracker.models.SourceApp
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * The order state machine. Turns parsed notifications into order updates:
 *  - matches an update to an existing active order (same notification, same merchant, or the app's only order),
 *  - only ever moves status forward (a late "preparing" never undoes "picked up"),
 *  - lets cancellation / failure / delivery end an order from any state,
 *  - never creates an order from a final status or from text without order context.
 */
class OrderManager(
    private val store: OrderStore,
    private val now: () -> Long = System::currentTimeMillis,
) {
    enum class Change { NEW, STATUS, ETA, DETAILS, NONE }

    data class Update(val order: Order, val change: Change, val previous: OrderStatus?)

    private val lock = Mutex()

    /**
     * @param postedAt when the delivery app posted the notification. Used as the order's update time, and to drop
     *   notifications that are older than what is already known (re-read from the shade after a restart).
     */
    suspend fun apply(app: SourceApp, sourcePackage: String, notificationKey: String?, result: ParseResult, postedAt: Long? = null): Update? = lock.withLock {
        if (!result.isOrderRelated) return null
        val t = now()
        val at = postedAt?.coerceAtMost(t) ?: t
        val sameApp = store.activeOrders().filter { it.sourceApp == app.id }
        val target = match(sameApp, notificationKey, result)
        if (target != null && at < target.lastUpdatedAt) return null    // older than the last update we applied

        if (target == null || startsNewOrder(target, notificationKey, result, at)) {
            if (result.status.isTerminal) return null                 // nothing active to complete
            if (!result.hasOrderContext) return null                   // too weak to start tracking
            if (result.status == OrderStatus.UNKNOWN && result.eta.isEmpty) return null
            // Posted before this app's last order ended: a leftover of that order, not a new one.
            store.lastFinished(app.id)?.completedAt?.let { if (at < it) return null }
            val order = Order(
                sourceApp = app.id, sourcePackage = sourcePackage,
                merchantName = result.merchantName, orderTitle = result.orderTitle,
                status = result.status, statusText = result.status.label,
                etaMinutes = result.eta.minutes, etaCapturedAt = result.eta.minutes?.let { at },
                estimatedDeliveryTime = result.eta.at, etaWindowStart = result.eta.windowStart,
                riderName = result.riderName, notificationKey = notificationKey,
                createdAt = at, lastUpdatedAt = at,
            )
            val id = store.insert(order)
            return Update(order.copy(id = id), Change.NEW, null)
        }

        val old = target
        val newStatus = nextStatus(old.status, result.status)
        val terminal = newStatus.isTerminal
        val hasEta = !result.eta.isEmpty && !terminal
        val updated = old.copy(
            status = newStatus,
            statusText = newStatus.label,
            merchantName = old.merchantName ?: result.merchantName,
            orderTitle = old.orderTitle ?: result.orderTitle,
            riderName = result.riderName ?: old.riderName,
            etaMinutes = if (terminal) null else if (hasEta) result.eta.minutes else old.etaMinutes,
            etaCapturedAt = if (terminal) null else if (hasEta) at else old.etaCapturedAt,
            estimatedDeliveryTime = if (terminal) null else if (hasEta) result.eta.at else old.estimatedDeliveryTime,
            etaWindowStart = if (terminal) null else if (hasEta) result.eta.windowStart else old.etaWindowStart,
            notificationKey = notificationKey ?: old.notificationKey,
            lastUpdatedAt = at,
            completedAt = if (terminal) t else null,
        )
        store.update(updated)
        val change = when {
            newStatus != old.status -> Change.STATUS
            updated.estimatedDeliveryTime != old.estimatedDeliveryTime -> Change.ETA
            updated.riderName != old.riderName || updated.merchantName != old.merchantName || updated.orderTitle != old.orderTitle -> Change.DETAILS
            else -> Change.NONE
        }
        return Update(updated, change, old.status)
    }

    /** Close orders that went silent: no update for [silenceMs], or more than [graceAfterEtaMs] past their ETA. */
    suspend fun archiveStale(silenceMs: Long = 3 * HOUR, graceAfterEtaMs: Long = 90 * MINUTE): List<Order> = lock.withLock {
        val t = now()
        store.activeOrders().filter { o ->
            t - o.lastUpdatedAt > silenceMs || (o.estimatedDeliveryTime != null && t - o.estimatedDeliveryTime > graceAfterEtaMs && t - o.lastUpdatedAt > 30 * MINUTE)
        }.map { o -> o.copy(archived = true, completedAt = t).also { store.update(it) } }
    }

    suspend fun markDone(order: Order) = lock.withLock { store.update(order.copy(archived = true, completedAt = now())) }

    /**
     * The delivery app removed its own ongoing tracking notification ([notificationKey]) at [removedAt].
     * Apps often do this when the order reaches the door. If the order was already picked up and nothing has arrived
     * since, close it as "no further updates". It is not marked delivered: the app never said so.
     */
    suspend fun trackerRemoved(notificationKey: String, removedAt: Long): Order? = lock.withLock {
        val o = store.activeOrders().firstOrNull { it.notificationKey == notificationKey } ?: return null
        if (o.status.rank < OrderStatus.PICKED_UP.rank || o.lastUpdatedAt > removedAt) return null
        o.copy(archived = true, completedAt = now()).also { store.update(it) }
    }

    private fun match(candidates: List<Order>, key: String?, r: ParseResult): Order? {
        if (candidates.isEmpty()) return null
        key?.let { k -> candidates.firstOrNull { it.notificationKey == k }?.let { return it } }
        r.merchantName?.let { m -> candidates.firstOrNull { it.merchantName.equals(m, ignoreCase = true) }?.let { return it } }
        // Otherwise the most recently updated order from the same app.
        return candidates.maxByOrNull { it.lastUpdatedAt }
    }

    /** A fresh "order confirmed" on a different notification while the old order is far along means a second order. */
    private fun startsNewOrder(existing: Order, key: String?, r: ParseResult, t: Long): Boolean =
        r.status == OrderStatus.CONFIRMED && existing.status.rank >= OrderStatus.PICKED_UP.rank &&
            key != null && key != existing.notificationKey && t - existing.lastUpdatedAt > 10 * MINUTE &&
            (r.merchantName == null || !r.merchantName.equals(existing.merchantName, ignoreCase = true))

    companion object {
        const val MINUTE = 60_000L
        const val HOUR = 60 * MINUTE

        /** Forward-only transitions; any final status ends the order. */
        fun nextStatus(current: OrderStatus, incoming: OrderStatus): OrderStatus = when {
            current.isTerminal -> current
            incoming.isTerminal -> incoming
            incoming.rank > current.rank -> incoming
            else -> current
        }
    }
}
