package com.pixy.ordertracker.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.ui.AppAvatar
import com.pixy.ordertracker.ui.Group
import com.pixy.ordertracker.ui.GroupDivider
import com.pixy.ordertracker.ui.MainViewModel
import com.pixy.ordertracker.ui.OneUiPage
import com.pixy.ordertracker.ui.Paragraph
import com.pixy.ordertracker.utils.AppIdentity
import com.pixy.ordertracker.utils.AppLauncher
import com.pixy.ordertracker.utils.Formatters

@Composable
fun DetailScreen(vm: MainViewModel, id: Long, back: () -> Unit) {
    val ctx = LocalContext.current
    val order by remember(id) { vm.order(id) }.collectAsState(initial = null)
    val now = rememberNow()
    val o = order
    val source = remember(o?.sourceApp) { o?.let { AppIdentity.of(ctx, it.sourceApp) } }

    OneUiPage(title = o?.merchantName ?: source?.displayName ?: "Order", subtitle = source?.displayName, onBack = back) {
        if (o == null || source == null) {
            item { Group { Paragraph("This order is no longer stored.") } }
            return@OneUiPage
        }
        item {
            Group {
                Column(Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AppAvatar(o.sourceApp, o.sourcePackage, 52.dp)
                        Spacer(Modifier.width(16.dp))
                        Column(Modifier.weight(1f)) {
                            Text(Formatters.statusLine(o), fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                            Text(
                                Formatters.etaLong(o, now) ?: if (o.isActive) "No ETA from ${source.displayName} yet" else "Ended ${Formatters.time(o.completedAt ?: o.lastUpdatedAt)}",
                                fontSize = 15.sp, color = if (o.isActive && o.estimatedDeliveryTime != null) Color(0xFF2EA862) else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    Spacer(Modifier.height(18.dp))
                    StepIndicator(o.status, Color(source.accentArgb))
                }
            }
        }
        item {
            Group {
                Timeline(o.status)
            }
        }
        item {
            Group {
                listOfNotNull(
                    "Service" to source.displayName,
                    o.merchantName?.let { "Store" to it },
                    o.orderTitle?.let { "Order" to it },
                    o.riderName?.let { "Delivery partner" to it },
                    "Placed" to Formatters.time(o.createdAt),
                    "Last update" to "${Formatters.time(o.lastUpdatedAt)} (${Formatters.relative(o.lastUpdatedAt, now)})",
                ).forEachIndexed { i, (k, v) ->
                    if (i > 0) GroupDivider()
                    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp)) {
                        Text(k, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                        Text(v, fontSize = 15.sp)
                    }
                }
            }
        }
        item {
            Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = { AppLauncher.open(ctx, o) }, modifier = Modifier.fillMaxWidth().height(50.dp)) { Text("Open ${source.displayName}", fontSize = 16.sp) }
                if (o.isActive) OutlinedButton(onClick = { vm.markDone(o); back() }, modifier = Modifier.fillMaxWidth().height(50.dp)) { Text("Stop tracking this order", fontSize = 16.sp) }
            }
        }
    }
}

@Composable
private fun Timeline(status: OrderStatus) {
    val steps = listOf(
        OrderStatus.CONFIRMED to "Confirmed", OrderStatus.PREPARING to "Preparing", OrderStatus.PICKED_UP to "Picked up",
        OrderStatus.OUT_FOR_DELIVERY to "On the way", OrderStatus.ARRIVING to "Arriving", OrderStatus.DELIVERED to "Delivered",
    )
    val ended = status == OrderStatus.CANCELLED || status == OrderStatus.FAILED
    Column(Modifier.padding(vertical = 8.dp)) {
        steps.forEach { (s, label) ->
            val reached = !ended && (status.rank >= s.rank || (status == OrderStatus.READY && s == OrderStatus.PREPARING))
            val current = !ended && (status == s || (status == OrderStatus.READY && s == OrderStatus.PREPARING))
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(12.dp).clip(CircleShape).background(if (reached) Color(0xFF34B26A) else MaterialTheme.colorScheme.surfaceContainerHighest))
                Spacer(Modifier.width(14.dp))
                Text(label, fontSize = 15.sp, fontWeight = if (current) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (reached) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (ended) Text(status.label, Modifier.padding(horizontal = 20.dp, vertical = 9.dp), color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
    }
}
