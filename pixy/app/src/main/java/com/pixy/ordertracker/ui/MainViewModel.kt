package com.pixy.ordertracker.ui

import android.app.Application
import android.content.Intent
import android.content.pm.PackageManager
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.pixy.ordertracker.app
import com.pixy.ordertracker.models.Order
import com.pixy.ordertracker.parsers.Apps
import com.pixy.ordertracker.settings.AnimationLevel
import com.pixy.ordertracker.settings.AppSettings
import com.pixy.ordertracker.settings.PillPlacement
import com.pixy.ordertracker.utils.AppIdentity
import com.pixy.ordertracker.utils.PermissionState
import com.pixy.ordertracker.utils.Permissions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class InstalledApp(val packageName: String, val label: String)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val a = application.app

    val active: StateFlow<List<Order>> = a.orders.activeOrders.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val recent: StateFlow<List<Order>> = a.orders.recentOrders().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val settings: StateFlow<AppSettings?> = a.settings.settings.stateIn(viewModelScope, SharingStarted.Eagerly, null)
    val listenerConnected = a.engine.listenerConnected
    val overlayUi = a.overlay.ui

    private val _permissions = MutableStateFlow(Permissions.state(application))
    val permissions: StateFlow<PermissionState> = _permissions

    fun refreshPermissions() {
        _permissions.value = Permissions.state(getApplication())
        a.overlay.refresh()
    }

    fun order(id: Long) = a.orders.order(id)

    fun setOnboardingDone() = edit { a.settings.setOnboardingDone(true) }
    fun setTracker(v: Boolean) = edit { a.settings.setTrackerEnabled(v) }
    fun setLive(v: Boolean) = edit { a.settings.setLiveNotification(v) }
    fun setAnimation(v: AnimationLevel) = edit { a.settings.setAnimationLevel(v) }
    fun setShowEta(v: Boolean) = edit { a.settings.setShowEta(v) }
    fun setAutoHide(v: Boolean) = edit { a.settings.setAutoHideDelivered(v) }
    fun setPlacement(v: PillPlacement) = edit { a.settings.setPlacement(v) }
    fun setDebugCapture(v: Boolean) = edit { a.settings.setDebugCapture(v) }
    fun setAppEnabled(id: String, v: Boolean) = edit { a.settings.setAppEnabled(id, v) }
    fun addCustomApp(app: InstalledApp) = edit { a.settings.addCustomApp(app.packageName, app.label, Apps.CUSTOM_PREFIX + app.packageName) }
    fun removeCustomApp(pkg: String) = edit { a.settings.removeCustomApp(pkg, Apps.CUSTOM_PREFIX + pkg) }

    fun clearHistory() = edit { a.orders.clearHistory() }
    fun clearAll() = edit { a.orders.clearAll() }
    fun clearTestOrders() = edit { a.orders.clearSimulated() }
    fun markDone(o: Order) { a.engine.markDone(o) }
    fun showTrackerAgain() { a.overlay.showAgain() }

    suspend fun installedApps(): List<InstalledApp> = withContext(Dispatchers.IO) {
        val pm = getApplication<Application>().packageManager
        val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val known = Apps.builtIn.map { it.launchPackage }.toSet() + getApplication<Application>().packageName
        val found = if (android.os.Build.VERSION.SDK_INT >= 33) pm.queryIntentActivities(launcher, PackageManager.ResolveInfoFlags.of(0))
        else @Suppress("DEPRECATION") pm.queryIntentActivities(launcher, 0)
        found
            .map { it.activityInfo.packageName }.distinct().filter { it !in known }
            .map { InstalledApp(it, AppIdentity.label(getApplication(), it) ?: it) }
            .sortedBy { it.label.lowercase() }
    }

    private fun edit(block: suspend () -> Unit) { viewModelScope.launch { block() } }
}
