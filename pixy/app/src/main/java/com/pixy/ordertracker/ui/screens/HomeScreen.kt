package com.pixy.ordertracker.ui.screens

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pixy.ordertracker.models.Order
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.ui.AppAvatar
import com.pixy.ordertracker.ui.Banner
import com.pixy.ordertracker.ui.Group
import com.pixy.ordertracker.ui.GroupDivider
import com.pixy.ordertracker.ui.MainViewModel
import com.pixy.ordertracker.ui.OneUiPage
import com.pixy.ordertracker.ui.Paragraph
import com.pixy.ordertracker.ui.Route
import com.pixy.ordertracker.ui.SectionTitle
import com.pixy.ordertracker.utils.AppIdentity
import com.pixy.ordertracker.utils.Formatters
import com.pixy.ordertracker.utils.Permissions
import kotlinx.coroutines.delay

/** Ticks every 30 s so ETAs count down on screen without touching the database. */
@Composable
fun rememberNow(): Long = produceState(System.currentTimeMillis()) { while (true) { delay(30_000); value = System.currentTimeMillis() } }.value

@Composable
fun HomeScreen(vm: MainViewModel, go: (Route) -> Unit) {
    val ctx = LocalContext.current
    val active by vm.active.collectAsState()
    val recent by vm.recent.collectAsState()
    val p by vm.permissions.collectAsState()
    val settings by vm.settings.collectAsState()
    val connected by vm.listenerConnected.collectAsState()
    val overlay by vm.overlayUi.collectAsState()
    val now = rememberNow()
    var confirmClear by remember { mutableStateOf(false) }

    OneUiPage(
        title = "Orders",
        subtitle = when (active.size) { 0 -> "Nothing on the way"; 1 -> "1 order on the way"; else -> "${active.size} orders on the way" },
        actions = {
            IconButton(onClick = { go(Route.TestMode) }) { Icon(Icons.Outlined.PlayArrow, "Test mode") }
            IconButton(onClick = { go(Route.Settings) }) { Icon(Icons.Outlined.Settings, "Settings") }
        },
    ) {
        if (!p.notificationAccess) item {
            Banner(
                "Notification access is required to detect orders.",
                "Pixy turns delivery notifications into the live tracker. Turn on access for Pixy on the next screen.",
                "Open settings",
            ) { Permissions.open(ctx, Permissions.notificationAccessIntent(ctx), Permissions.notificationAccessFallback()) }
        } else if (!connected) item {
            Banner(
                "Waiting for Android to connect the listener",
                "Access is on, but Android hasn't started Pixy's listener yet. This usually fixes itself within a minute; " +
                    "if not, set Battery to Unrestricted in App info or turn access off and on again.",
                "Open App info",
            ) { Permissions.open(ctx, Permissions.appDetailsIntent(ctx)) }
        }
        if (!p.overlay && settings?.trackerEnabled == true) item {
            Banner(
                "The floating tracker can't appear yet",
                "Allow \"Display over other apps\" for Pixy. Orders are still tracked here until then.",
                "Allow",
            ) { Permissions.open(ctx, Permissions.overlayIntent(ctx)) }
        }

        item { SectionTitle("Active orders") }
        if (active.isEmpty()) item {
            Group { Paragraph("When Swiggy, Zomato, Blinkit, BigBasket or Instamart send an order update, it appears here and in the floating pill. Use test mode (▶ above) to try it without ordering.") }
        }
        items(active, key = { it.id }) { o -> ActiveCard(o, now, settings?.showEta != false) { go(Route.Detail(o.id)) } }
        if (active.isNotEmpty() && p.overlay && settings?.trackerEnabled == true && !overlay.visible) item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                TextButton(onClick = vm::showTrackerAgain) { Text("Show floating tracker") }
            }
        }

        item { SectionTitle("Recent orders", action = if (recent.isNotEmpty()) "Clear" else null, onAction = { confirmClear = true }) }
        if (recent.isEmpty()) item { Group { Paragraph("Delivered and cancelled orders show up here.") } }
        else item {
            Group {
                recent.forEachIndexed { i, o ->
                    if (i > 0) GroupDivider()
                    RecentRow(o) { go(Route.Detail(o.id)) }
                }
            }
        }
    }

    if (confirmClear) AlertDialog(
        onDismissRequest = { confirmClear = false },
        title = { Text("Clear order history?") },
        text = { Text("Delivered and cancelled orders are deleted from this phone. Active orders stay.") },
        confirmButton = { TextButton(onClick = { vm.clearHistory(); confirmClear = false }) { Text("Clear") } },
        dismissButton = { TextButton(onClick = { confirmClear = false }) { Text("Cancel") } },
    )
}

@Composable
private fun ActiveCard(o: Order, now: Long, showEta: Boolean, onClick: () -> Unit) {
    val ctx = LocalContext.current
    val source = remember(o.sourceApp) { AppIdentity.of(ctx, o.sourceApp) }
    val eta = if (showEta) Formatters.etaShort(o, now) else null
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(26.dp)).background(MaterialTheme.colorScheme.surfaceContainer)
            .clickable(onClick = onClick).animateContentSize().padding(20.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AppAvatar(o.sourceApp, o.sourcePackage, 46.dp)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(source.displayName, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(o.merchantName ?: o.orderTitle ?: "Your order", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (eta != null) Text("~$eta", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF2EA862))
        }
        Spacer(Modifier.height(14.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(Formatters.statusLine(o), fontSize = 15.sp, modifier = Modifier.weight(1f))
            Text("Updated ${Formatters.relative(o.lastUpdatedAt, now)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.height(10.dp))
        StepIndicator(o.status, Color(source.accentArgb))
    }
}

@Composable
fun StepIndicator(status: OrderStatus, accent: Color) {
    val filled = when (status) {
        OrderStatus.UNKNOWN -> 0; OrderStatus.CONFIRMED -> 1; OrderStatus.PREPARING, OrderStatus.READY -> 2
        OrderStatus.PICKED_UP -> 3; OrderStatus.OUT_FOR_DELIVERY -> 4; else -> 5
    }
    Row(Modifier.fillMaxWidth().height(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        repeat(5) { i ->
            Spacer(Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp)).background(if (i < filled) accent else MaterialTheme.colorScheme.surfaceContainerHighest))
        }
    }
}

@Composable
private fun RecentRow(o: Order, onClick: () -> Unit) {
    val ctx = LocalContext.current
    val source = remember(o.sourceApp) { AppIdentity.of(ctx, o.sourceApp) }
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 20.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
        AppAvatar(o.sourceApp, o.sourcePackage, 36.dp)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(listOfNotNull(source.displayName, o.merchantName).joinToString(" · "), fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                listOfNotNull(Formatters.statusLine(o), (o.completedAt ?: o.lastUpdatedAt).let { Formatters.time(it) }, if (o.notificationKey?.startsWith("sim:") == true) "Test" else null).joinToString(" · "),
                fontSize = 13.sp, color = if (o.isCancelled) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
