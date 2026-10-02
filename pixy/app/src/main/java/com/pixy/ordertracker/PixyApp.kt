package com.pixy.ordertracker

import android.app.Application
import com.pixy.ordertracker.data.AppDatabase
import com.pixy.ordertracker.data.OrderRepository
import com.pixy.ordertracker.domain.OrderEngine
import com.pixy.ordertracker.domain.OrderManager
import com.pixy.ordertracker.notifications.TrackerNotifier
import com.pixy.ordertracker.overlay.OverlayController
import com.pixy.ordertracker.parsers.AdapterRegistry
import com.pixy.ordertracker.parsers.NotificationParser
import com.pixy.ordertracker.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/** Manual dependency graph: small app, no DI framework needed. */
class PixyApp : Application() {
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val database by lazy { AppDatabase.create(this) }
    val orders by lazy { OrderRepository(database.orders()) }
    val settings by lazy { SettingsRepository(this) }
    val registry = AdapterRegistry()
    val parser by lazy { NotificationParser(registry) }
    val manager by lazy { OrderManager(orders) }
    val notifier by lazy { TrackerNotifier(this) }
    val engine by lazy { OrderEngine(this) }
    val overlay by lazy { OverlayController(this) }
    val simulator by lazy { com.pixy.ordertracker.domain.Simulator(this) }

    override fun onCreate() {
        super.onCreate()
        engine.start()
        overlay.start()
    }
}

val android.content.Context.app: PixyApp get() = applicationContext as PixyApp
