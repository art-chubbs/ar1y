package com.pixy.ordertracker.overlay

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.settings.AnimationLevel

/** One order as the pill shows it. Built from [com.pixy.ordertracker.models.Order]; no raw notification text. */
data class IslandItem(
    val orderId: Long,
    val appId: String,
    val appName: String,
    val packageName: String,
    val emoji: String,
    val accent: Color,
    val icon: ImageBitmap?,
    val merchant: String?,
    val title: String?,
    val status: OrderStatus,
    val statusLine: String,
    val etaShort: String?,
    val etaLong: String?,
    val updatedAt: Long,
)

enum class IslandMode {
    /** Tiny pill: icon + ETA. */
    COMPACT,
    /** Slightly wider: icon + status + ETA, shown briefly for a new order or a status change. */
    PEEK,
    /** Card with details and actions. */
    EXPANDED,
}

data class IslandUi(
    val visible: Boolean = false,
    val items: List<IslandItem> = emptyList(),
    val mode: IslandMode = IslandMode.COMPACT,
    val peekId: Long? = null,
    /** Final state shown briefly after an order ends (Delivered / Cancelled). */
    val finale: IslandItem? = null,
    val pulse: Int = 0,
    val hugsCamera: Boolean = false,
    val cutoutWidthDp: Float = 0f,
    val animation: AnimationLevel = AnimationLevel.FULL,
    val showEta: Boolean = true,
) {
    val primary: IslandItem? get() = peekId?.let { id -> items.firstOrNull { it.orderId == id } } ?: items.firstOrNull()
}

/** Callbacks from the pill back to [OverlayController]. */
interface IslandActions {
    fun onTap()
    fun onOpen(item: IslandItem)
    fun onDetails(item: IslandItem)
    fun onDismiss()
    fun onCollapse()
    fun onInteraction()
}
