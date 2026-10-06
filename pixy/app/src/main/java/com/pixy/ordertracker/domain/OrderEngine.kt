package com.pixy.ordertracker.domain

import android.app.PendingIntent
import com.pixy.ordertracker.PixyApp
import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.Eta
import com.pixy.ordertracker.models.Order
import com.pixy.ordertracker.models.ParseResult
import com.pixy.ordertracker.notifications.OrderListenerService
import com.pixy.ordertracker.notifications.SnapshotExtractor
import com.pixy.ordertracker.parsers.EtaParser
import com.pixy.ordertracker.parsers.TextNormalizer
import com.pixy.ordertracker.settings.AppSettings
import com.pixy.ordertracker.utils.DebugEntry
import com.pixy.ordertracker.utils.DebugLog
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.concurrent.ConcurrentHashMap

/**
 * NotificationListenerService -> NotificationParser -> OrderManager -> (Room, overlay, live notification).
 * Event driven: no polling of delivery apps. The only timer is a slow staleness check while orders are active.
 */
class OrderEngine(private val app: PixyApp) {

    private val _events = MutableSharedFlow<OrderManager.Update>(extraBufferCapacity = 16)
    /** Order changes, used by the overlay for "new order" and "status changed" animations. */
    val events: SharedFlow<OrderManager.Update> = _events

    private val _listenerConnected = MutableStateFlow(false)
    val listenerConnected: StateFlow<Boolean> = _listenerConnected

    @Volatile private var settings = AppSettings()
    private val lastContent = ConcurrentHashMap<String, Int>()
    /** Tap targets from the delivery apps' own notifications (deep links). Memory only; cannot be persisted. */
    private val contentIntents = ConcurrentHashMap<Long, PendingIntent>()
    private var staleJob: Job? = null
    /** Notifications of orders the user chose to stop tracking (kept for the life of the process). */
    private val muted = ConcurrentHashMap.newKeySet<String>()

    /** Everything from the listener goes through one queue, so updates are applied in the order they were posted. */
    private sealed interface Event {
        class Posted(val snapshot: NotificationSnapshot, val contentIntent: PendingIntent?, val simulated: Boolean, val manual: Boolean = false) : Event
        class Removed(val key: String, val at: Long) : Event
    }
    private val inbox = Channel<Event>(Channel.UNLIMITED)

    fun start() {
        app.appScope.launch {
            for (e in inbox) {
                runCatching {
                    when (e) {
                        is Event.Posted -> handlePosted(e.snapshot, e.contentIntent, e.simulated, e.manual)
                        is Event.Removed -> handleRemoved(e.key, e.at)
                    }
                }.onFailure { DebugLog.w("engine", "event failed", it) }   // one bad notification never stops the queue
            }
        }
        app.appScope.launch {
            app.settings.settings.collect { s ->
                settings = s
                app.registry.configure(s.enabledApps, s.customApps)
                if (!s.debugCapture) DebugLog.clear()
            }
        }
        app.appScope.launch {
            app.orders.activeOrders.map { it.isNotEmpty() }.distinctUntilChanged().collectLatest { any ->
                staleJob?.cancel()
                if (any) staleJob = launch { while (true) { archiveStale(); delay(10 * 60_000L) } }
            }
        }
        app.appScope.launch {
            app.orders.activeOrders.collect { active -> app.notifier.sync(active, settings) }
        }
        app.appScope.launch { app.orders.prune(System.currentTimeMillis()) }
    }

    fun setListenerConnected(connected: Boolean) { _listenerConnected.value = connected }

    /** Cheap package check made on the listener thread before any notification text is read. */
    fun watches(packageName: String) = app.registry.watches(packageName)

    fun onSnapshot(snapshot: NotificationSnapshot, contentIntent: PendingIntent?, simulated: Boolean = false) {
        inbox.trySend(Event.Posted(snapshot, contentIntent, simulated))
    }

    /** A watched app cancelled one of its own ongoing notifications (not the user swiping it away). */
    fun onTrackerRemoved(key: String, at: Long = System.currentTimeMillis()) {
        inbox.trySend(Event.Removed(key, at))
    }

    /** One delivery notification found by [scanNow], with what the parser made of it. */
    class Found(val snapshot: NotificationSnapshot, val contentIntent: PendingIntent?, val appId: String?, val appName: String, val result: ParseResult)

    /**
     * Reads the delivery notifications currently in the shade, sends them through the tracker, and reports what the
     * parser decided for each. Null when Android hasn't connected the listener. Call off the main thread.
     */
    fun scanNow(): List<Found>? {
        val sbns = OrderListenerService.connected?.deliveryNotifications() ?: return null
        return sbns.sortedByDescending { it.postTime }.map { sbn ->
            val snap = SnapshotExtractor.from(sbn)
            val outcome = app.parser.parse(snap)
            val intent = sbn.notification.contentIntent
            onSnapshot(snap, intent)
            Found(snap, intent, outcome.adapter?.app?.id, outcome.adapter?.app?.displayName ?: snap.packageName, outcome.result)
        }
    }

    /** The user asked to track a notification the parser did not recognise as an order. */
    fun trackManually(found: Found) {
        inbox.trySend(Event.Posted(found.snapshot, found.contentIntent, simulated = false, manual = true))
    }

    private suspend fun handlePosted(snapshot: NotificationSnapshot, contentIntent: PendingIntent?, simulated: Boolean, manual: Boolean = false) {
        if (manual) muted -= snapshot.key
        if (!simulated && snapshot.key in muted) return
        val hash = snapshot.combinedText.hashCode()
        if (lastContent.size > 300) lastContent.clear()
        if (!simulated && !manual && lastContent.put(snapshot.key, hash) == hash) return   // same text re-posted (progress ticks)
        val outcome = app.parser.parse(snapshot)
        val r = if (manual && !outcome.result.isOrderRelated) manualResult(snapshot, outcome.result) else outcome.result
        if (settings.debugCapture) {
            DebugLog.add(DebugEntry(snapshot.postTime, snapshot.packageName, snapshot.title, snapshot.text ?: snapshot.bigText,
                outcome.adapter?.app?.displayName ?: "none", r.status.name, r.eta.minutes, r.isOrderRelated, r.reason, simulated))
        }
        val adapter = outcome.adapter ?: return
        val update = app.manager.apply(adapter.app, snapshot.packageName, snapshot.key, r, postedAt = snapshot.postTime, manual = manual) ?: return
        contentIntent?.let { contentIntents[update.order.id] = it }
        if (!update.order.isActive) contentIntents.remove(update.order.id)
        _events.emit(update)
    }

    /** For "Track it": keep whatever ETA the text states, even though the wording wasn't recognised as an order. */
    private fun manualResult(snapshot: NotificationSnapshot, ignored: ParseResult): ParseResult {
        val posted = ZonedDateTime.ofInstant(Instant.ofEpochMilli(minOf(snapshot.postTime, System.currentTimeMillis())), ZoneId.systemDefault())
        val eta = runCatching { EtaParser.parse(TextNormalizer.forMatching(snapshot.combinedText), posted) }.getOrDefault(Eta())
        return ignored.copy(isOrderRelated = true, hasOrderContext = true, eta = eta, reason = "tracked by you (${ignored.reason})")
    }

    private fun handleRemoved(key: String, at: Long) {
        lastContent.remove(key)
        // Give the app a moment to post its "Delivered" message (often sent right after the tracker goes away).
        app.appScope.launch {
            delay(TRACKER_GONE_GRACE_MS)
            app.manager.trackerRemoved(key, at)?.let { contentIntents.remove(it.id) }
        }
    }

    fun contentIntentFor(order: Order): PendingIntent? = contentIntents[order.id]

    fun markDone(order: Order) = app.appScope.launch {
        order.notificationKey?.takeUnless { it.startsWith("sim:") }?.let { muted += it }
        contentIntents.remove(order.id)
        app.manager.markDone(order)
    }

    companion object { const val TRACKER_GONE_GRACE_MS = 2 * 60_000L }

    private suspend fun archiveStale() {
        runCatching { app.manager.archiveStale() }.onFailure { DebugLog.w("engine", "stale check failed", it) }
    }
}
