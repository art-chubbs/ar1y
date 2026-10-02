package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.NotificationSnapshot

/**
 * Holds every adapter and decides which one (if any) handles a notification.
 * To support a new service: add an adapter class and list it in [builtIn].
 */
class AdapterRegistry(
    private val builtIn: List<DeliveryAppAdapter> = defaultAdapters(),
) {
    @Volatile private var custom: List<DeliveryAppAdapter> = emptyList()
    @Volatile private var enabledIds: Set<String>? = null   // null = all enabled

    val all: List<DeliveryAppAdapter> get() = builtIn + custom

    fun configure(enabled: Set<String>?, customApps: Map<String, String>) {
        enabledIds = enabled
        custom = customApps.map { (pkg, label) -> GenericDeliveryAdapter(pkg, label) }
    }

    private fun isEnabled(a: DeliveryAppAdapter) = enabledIds?.contains(a.app.id) ?: true

    /** Cheap pre-check by package only, so text from unrelated apps is never read. */
    fun watches(packageName: String): Boolean = all.any { isEnabled(it) && packageName in it.packageNames }

    fun adapterFor(snapshot: NotificationSnapshot): DeliveryAppAdapter? =
        all.filter { isEnabled(it) && it.canHandle(snapshot) }.maxByOrNull { it.priority }

    fun byId(id: String): DeliveryAppAdapter? = all.firstOrNull { it.app.id == id }

    companion object {
        fun defaultAdapters(): List<DeliveryAppAdapter> =
            listOf(SwiggyAdapter(), InstamartAdapter(), ZomatoAdapter(), BlinkitAdapter(), BigBasketAdapter())
    }
}
