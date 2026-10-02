package com.pixy.ordertracker.screenshots

import android.graphics.Bitmap
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.overlay.Island
import com.pixy.ordertracker.overlay.IslandActions
import com.pixy.ordertracker.overlay.IslandItem
import com.pixy.ordertracker.overlay.IslandMode
import com.pixy.ordertracker.overlay.IslandUi
import com.pixy.ordertracker.settings.AnimationLevel
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/** Renders the pill in each state to build/screenshots for visual review (no device needed). */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [36], qualifiers = "w411dp-h891dp-xxhdpi")
class PillScreenshots {
    @get:Rule val rule = createComposeRule()

    private val noop = object : IslandActions {
        override fun onTap() {}; override fun onOpen(item: IslandItem) {}; override fun onDetails(item: IslandItem) {}
        override fun onDismiss() {}; override fun onCollapse() {}; override fun onInteraction() {}
    }

    private fun item(id: Long, app: String, accent: Long, merchant: String?, status: OrderStatus, line: String, eta: String?, long: String?, title: String? = null) =
        IslandItem(id, app.lowercase(), app, "pkg.$app", "", Color(accent), null, merchant, title, status, line, eta, long, 0)

    private val swiggy = item(1, "Swiggy", 0xFFFC8019, "Paradise Biryani", OrderStatus.PICKED_UP, "Ramesh picked up your order", "12 min", "Arriving in ~12 min", "Chicken Biryani")
    private val blinkit = item(2, "Blinkit", 0xFFF8CB46, null, OrderStatus.PREPARING, "Preparing", "24 min", "Arriving in ~24 min", "8 items")

    private fun shot(name: String, content: @Composable () -> Unit) {
        rule.setContent {
            Box(Modifier.fillMaxWidth().background(Color(0xFFDADDE3)).padding(vertical = 16.dp), contentAlignment = Alignment.TopCenter) { content() }
        }
        rule.mainClock.advanceTimeBy(2000)
        val bmp = rule.onRoot().captureToImage().asAndroidBitmap()
        val dir = File("build/screenshots").apply { mkdirs() }
        File(dir, "$name.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun ui(mode: IslandMode, items: List<IslandItem>, finale: IslandItem? = null, peek: Long? = null) =
        IslandUi(visible = true, items = items, mode = mode, peekId = peek, finale = finale, animation = AnimationLevel.FULL)

    @Test fun compactSingle() = shot("pill_1_compact") { Island(ui(IslandMode.COMPACT, listOf(swiggy)), noop) }
    @Test fun compactMulti() = shot("pill_2_compact_two_orders") { Island(ui(IslandMode.COMPACT, listOf(swiggy, blinkit)), noop) }
    @Test fun peek() = shot("pill_3_peek_status_change") { Island(ui(IslandMode.PEEK, listOf(swiggy), peek = 1), noop) }
    @Test fun expandedSingle() = shot("pill_4_expanded") { Island(ui(IslandMode.EXPANDED, listOf(swiggy)), noop) }
    @Test fun expandedMulti() = shot("pill_5_expanded_two_orders") { Island(ui(IslandMode.EXPANDED, listOf(swiggy, blinkit)), noop) }
    @Test fun delivered() = shot("pill_6_delivered") {
        Island(ui(IslandMode.COMPACT, emptyList(), finale = swiggy.copy(status = OrderStatus.DELIVERED)), noop)
    }
    @Test fun noEta() = shot("pill_7_no_eta") {
        Island(ui(IslandMode.EXPANDED, listOf(swiggy.copy(status = OrderStatus.PREPARING, statusLine = "Preparing", etaShort = null, etaLong = null))), noop)
    }
}
