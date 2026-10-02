package com.pixy.ordertracker.domain

import android.app.PendingIntent
import com.pixy.ordertracker.PixyApp
import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.Order
import com.pixy.ordertracker.settings.AppSettings
import com.pixy.ordertracker.utils.DebugEntry
import com.pixy.ordertracker.utils.DebugLog
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
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

    fun start() {
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
        app.appScope.launch {
            if (!simulated && snapshot.key in muted) return@launch
            val hash = snapshot.combinedText.hashCode()
            if (lastContent.size > 300) lastContent.clear()
            if (!simulated && lastContent.put(snapshot.key, hash) == hash) return@launch   // same text re-posted (progress ticks)
            val outcome = app.parser.parse(snapshot)
            val r = outcome.result
            if (settings.debugCapture) {
                DebugLog.add(DebugEntry(snapshot.postTime, snapshot.packageName, snapshot.title, snapshot.text ?: snapshot.bigText,
                    outcome.adapter?.app?.displayName ?: "none", r.status.name, r.eta.minutes, r.isOrderRelated, r.reason, simulated))
            }
            val adapter = outcome.adapter ?: return@launch
            val update = runCatching { app.manager.apply(adapter.app, snapshot.packageName, snapshot.key, r) }
                .onFailure { DebugLog.w("engine", "apply failed", it) }.getOrNull() ?: return@launch
            contentIntent?.let { contentIntents[update.order.id] = it }
            if (!update.order.isActive) contentIntents.remove(update.order.id)
            _events.emit(update)
        }
    }

    fun contentIntentFor(order: Order): PendingIntent? = contentIntents[order.id]

    fun markDone(order: Order) = app.appScope.launch {
        order.notificationKey?.takeUnless { it.startsWith("sim:") }?.let { muted += it }
        contentIntents.remove(order.id)
        app.manager.markDone(order)
    }

    private suspend fun archiveStale() {
        runCatching { app.manager.archiveStale() }.onFailure { DebugLog.w("engine", "stale check failed", it) }
    }
}
