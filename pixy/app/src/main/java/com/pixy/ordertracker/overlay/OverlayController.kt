package com.pixy.ordertracker.overlay

import android.content.ComponentCallbacks
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.provider.Settings
import android.view.Display
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.pixy.ordertracker.PixyApp
import com.pixy.ordertracker.domain.OrderManager
import com.pixy.ordertracker.models.Order
import com.pixy.ordertracker.settings.AnimationLevel
import com.pixy.ordertracker.settings.AppSettings
import com.pixy.ordertracker.ui.MainActivity
import com.pixy.ordertracker.utils.AppIdentity
import com.pixy.ordertracker.utils.AppLauncher
import com.pixy.ordertracker.utils.DebugLog
import com.pixy.ordertracker.utils.Formatters
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Owns the floating pill window. Shows it only while there is something to track,
 * keeps one window alive across updates (content animates, the window is never recreated),
 * and removes it when the last order ends.
 *
 * Android limits respected here:
 *  - TYPE_APPLICATION_OVERLAY windows sit *below* the status bar and IME; the pill cannot draw over system UI.
 *  - The window wraps the pill exactly, so every touch outside it goes straight to the app underneath.
 */
class OverlayController(private val app: PixyApp) : IslandActions {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val _ui = MutableStateFlow(IslandUi())
    val ui: StateFlow<IslandUi> = _ui

    private var orders: List<Order> = emptyList()
    private var settings = AppSettings()
    /** orderId -> lastUpdatedAt when the user swiped the pill away; reappears on the next real update. */
    private var dismissed: Map<Long, Long>? = null
    private var mode = IslandMode.COMPACT
    private var peekId: Long? = null
    private var finale: IslandItem? = null
    private var pulse = 0

    private var window: PillWindow? = null
    private var peekJob: Job? = null
    private var collapseJob: Job? = null
    private var finaleJob: Job? = null
    private var removeJob: Job? = null
    private var tickJob: Job? = null

    fun start() {
        scope.launch {
            combine(app.orders.activeOrders, app.settings.settings) { o, s -> o to s }.collect { (o, s) ->
                orders = o; settings = s
                render()
            }
        }
        scope.launch { app.engine.events.collect(::onUpdate) }
        app.registerComponentCallbacks(object : ComponentCallbacks {
            override fun onConfigurationChanged(newConfig: Configuration) { window?.reposition(settings) }
            @Deprecated("Deprecated in Java") override fun onLowMemory() {}
        })
    }

    fun canDrawOverlays(): Boolean = Settings.canDrawOverlays(app)

    /** True while the pill's overlay window is added to the screen. */
    val windowAttached: Boolean get() = window != null

    /** Re-evaluate after the user returns from a settings screen (permissions may have changed). */
    fun refresh() = scope.launch { render() }

    /** Undo a swipe-away. */
    fun showAgain() = scope.launch { dismissed = null; render() }

    // ---------- reacting to order changes ----------

    private fun onUpdate(u: OrderManager.Update) {
        val o = u.order
        // Apply the change now: the event can arrive before Room's flow re-emits the active list,
        // and the intro / status animation must not wait for (or be undone by) that round trip.
        orders = if (o.isActive) orders.filterNot { it.id == o.id } + o else orders.filterNot { it.id == o.id }
        when {
            !o.isActive && !o.archived -> showFinale(o)
            u.change == OrderManager.Change.NEW -> { dismissed = dismissed?.minus(o.id); peek(o.id, 3200) }
            u.change == OrderManager.Change.STATUS -> peek(o.id, 2400)
            u.change == OrderManager.Change.ETA && mode == IslandMode.COMPACT -> { pulse++; render() }
        }
    }

    private fun peek(id: Long, ms: Long) {
        if (mode == IslandMode.EXPANDED) { pulse++; render(); return }
        mode = IslandMode.PEEK; peekId = id; pulse++
        render()
        peekJob?.cancel()
        peekJob = scope.launch { delay(ms); if (mode == IslandMode.PEEK) { mode = IslandMode.COMPACT; peekId = null; render() } }
    }

    private fun showFinale(o: Order) {
        finale = item(o, System.currentTimeMillis())
        if (mode == IslandMode.PEEK) mode = IslandMode.COMPACT
        dismissed = dismissed?.minus(o.id)
        pulse++
        render()
        finaleJob?.cancel()
        if (settings.autoHideDelivered) finaleJob = scope.launch { delay(3800); finale = null; render() }
    }

    // ---------- IslandActions ----------

    override fun onTap() {
        if (finale != null && orders.isEmpty()) { finale = null; render(); return }
        mode = if (mode == IslandMode.EXPANDED) IslandMode.COMPACT else IslandMode.EXPANDED
        peekJob?.cancel(); peekId = null
        if (mode == IslandMode.EXPANDED) finale = null
        render()
        scheduleCollapse()
    }

    override fun onOpen(item: IslandItem) {
        val order = orders.firstOrNull { it.id == item.orderId }
        val ok = if (order != null) AppLauncher.open(app, order) else AppLauncher.openPackage(app, item.packageName)
        if (!ok) DebugLog.w("overlay", "could not open ${item.packageName}")
        onCollapse()
    }

    override fun onDetails(item: IslandItem) {
        val i = Intent(app, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_ORDER_ID, item.orderId)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        runCatching { app.startActivity(i) }
        onCollapse()
    }

    override fun onDismiss() {
        dismissed = orders.associate { it.id to it.lastUpdatedAt }
        finale = null; mode = IslandMode.COMPACT
        render()
    }

    override fun onCollapse() {
        if (mode != IslandMode.COMPACT) { mode = IslandMode.COMPACT; render() }
    }

    override fun onInteraction() = scheduleCollapse()

    private fun scheduleCollapse() {
        collapseJob?.cancel()
        if (mode == IslandMode.EXPANDED) collapseJob = scope.launch { delay(8000); onCollapse() }
    }

    // ---------- rendering ----------

    private fun visibleOrders(): List<Order> {
        val d = dismissed ?: return orders
        return orders.filter { o -> d[o.id]?.let { o.lastUpdatedAt > it } ?: true }
    }

    private fun render() {
        val now = System.currentTimeMillis()
        val items = sortForDisplay(visibleOrders(), now).map { item(it, now) }
        val allowed = settings.trackerEnabled && canDrawOverlays()
        val wantVisible = allowed && (items.isNotEmpty() || finale != null)
        if (items.isEmpty() && mode == IslandMode.EXPANDED && finale == null) mode = IslandMode.COMPACT
        val anchor = window?.anchor
        _ui.value = IslandUi(
            visible = wantVisible, items = items, mode = mode, peekId = peekId, finale = finale, pulse = pulse,
            hugsCamera = anchor?.hugsCamera ?: false,
            cutoutWidthDp = (anchor?.cutoutWidthPx ?: 0) / app.resources.displayMetrics.density,
            animation = settings.animationLevel, showEta = settings.showEta,
        )
        if (wantVisible) ensureWindow() else scheduleRemoval()
    }

    /** Most important first: just-updated orders, then the one closest to the door, then the soonest ETA. */
    private fun sortForDisplay(list: List<Order>, now: Long): List<Order> =
        list.sortedWith(
            compareByDescending<Order> { now - it.lastUpdatedAt < 90_000 }
                .thenByDescending { it.status.rank }
                .thenBy { it.estimatedDeliveryTime ?: Long.MAX_VALUE }
                .thenByDescending { it.lastUpdatedAt },
        )

    private fun item(o: Order, now: Long): IslandItem {
        val source = AppIdentity.of(app, o.sourceApp)
        return IslandItem(
            orderId = o.id, appId = o.sourceApp, appName = source.displayName, packageName = o.sourcePackage, emoji = source.emoji,
            accent = Color(source.accentArgb), icon = AppIdentity.icon(app, o.sourcePackage)?.asImageBitmap(),
            merchant = o.merchantName, title = o.orderTitle, status = o.status, statusLine = Formatters.statusLine(o),
            etaShort = Formatters.etaShort(o, now), etaLong = Formatters.etaLong(o, now), updatedAt = o.lastUpdatedAt,
        )
    }

    private fun ensureWindow() {
        removeJob?.cancel(); removeJob = null
        if (window == null) {
            window = runCatching { PillWindow(app, this, _ui).also { it.attach(settings) } }
                .onFailure { DebugLog.w("overlay", "could not add overlay window", it) }.getOrNull()
            render()   // re-render with the real anchor (camera cutout)
        } else {
            window?.reposition(settings)
        }
        if (tickJob == null) tickJob = scope.launch { while (true) { delay(30_000); render() } }   // ETA countdown text only
    }

    private fun scheduleRemoval() {
        if (window == null || removeJob != null) return
        tickJob?.cancel(); tickJob = null
        val wait = if (settings.animationLevel == AnimationLevel.OFF) 0L else 450L   // let the exit animation finish
        removeJob = scope.launch {
            delay(wait)
            window?.detach(); window = null; removeJob = null
            mode = IslandMode.COMPACT
        }
    }
}

/** The overlay window hosting the Compose pill. */
private class PillWindow(context: Context, private val actions: IslandActions, private val state: StateFlow<IslandUi>) {
    private val display: Display = context.getSystemService(DisplayManager::class.java).getDisplay(Display.DEFAULT_DISPLAY)
    private val windowContext = context.createWindowContext(display, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, null)
    private val wm = windowContext.getSystemService(WindowManager::class.java)
    private val owner = OverlayLifecycleOwner()
    var anchor: PillAnchor? = null
        private set

    private val root = object : FrameLayout(windowContext) {
        override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
            if (ev.actionMasked == MotionEvent.ACTION_OUTSIDE) { actions.onCollapse(); return false }   // tap elsewhere collapses the card
            actions.onInteraction()
            return super.dispatchTouchEvent(ev)
        }
    }

    private val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT,
    ).apply {
        layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        fitInsetsTypes = 0                      // position from the very top of the screen, not below the status bar
        title = "Pixy order tracker"
        windowAnimations = 0                    // all motion is done in Compose
    }

    fun attach(settings: AppSettings) {
        owner.create()
        val compose = ComposeView(windowContext).apply {
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
            setContent {
                val s by state.collectAsState()
                Island(s, actions)
            }
        }
        root.setViewTreeLifecycleOwner(owner)
        root.setViewTreeSavedStateRegistryOwner(owner)
        root.addView(compose)
        place(settings)
        wm.addView(root, params)
    }

    fun reposition(settings: AppSettings) {
        val before = anchor
        place(settings)
        if (anchor != before && root.isAttachedToWindow) runCatching { wm.updateViewLayout(root, params) }
    }

    private fun place(settings: AppSettings) {
        val a = PillPositioner.compute(wm, settings.placement, windowContext.resources.displayMetrics.density)
        anchor = a
        params.gravity = a.gravity; params.x = a.x; params.y = a.y
    }

    fun detach() {
        runCatching { wm.removeViewImmediate(root) }
        owner.destroy()
    }
}
