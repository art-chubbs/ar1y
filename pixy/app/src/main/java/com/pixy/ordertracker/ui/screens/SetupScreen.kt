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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pixy.ordertracker.ui.Group
import com.pixy.ordertracker.ui.MainViewModel
import com.pixy.ordertracker.ui.OneUiPage
import com.pixy.ordertracker.utils.Permissions

@Composable
fun SetupScreen(vm: MainViewModel, onDone: () -> Unit) {
    val ctx = LocalContext.current
    val p by vm.permissions.collectAsState()

    OneUiPage(title = "Welcome to Pixy", subtitle = "A small live tracker for your food and grocery orders, at the top of your screen.") {
        item {
            StepCard(
                n = 1, done = true, title = "Stays on your phone",
                body = "Pixy reads delivery notifications on this phone and keeps only the order status, ETA and store name. " +
                    "No account, no cloud, no analytics, no ads. The app has no internet permission, so it cannot send anything anywhere.",
            )
        }
        item {
            StepCard(
                n = 2, done = p.notificationAccess, title = "Notification access",
                body = "This lets Pixy read delivery notifications from Swiggy, Zomato, Blinkit, BigBasket and Instamart and turn them " +
                    "into a live order tracker. Notifications from other apps are ignored before their text is read, and chat " +
                    "messages are never delivered to Pixy at all.",
                button = "Allow notification access",
                onClick = { Permissions.open(ctx, Permissions.notificationAccessIntent(ctx), Permissions.notificationAccessFallback()) },
                hint = "Switch greyed out with \"Restricted setting\"? Android blocks this for apps installed from a file. " +
                    "Open App info, tap ⋮ (top right), choose \"Allow restricted settings\", then try again.",
                hintButton = "Open App info",
                onHint = { Permissions.open(ctx, Permissions.appDetailsIntent(ctx)) },
            )
        }
        item {
            StepCard(
                n = 3, done = p.overlay, title = "Floating tracker",
                body = "\"Display over other apps\" lets the order pill float at the top of the screen. It only appears while you " +
                    "have an active order, and it covers nothing else: touches outside the pill go to the app underneath.",
                button = "Allow floating tracker",
                onClick = { Permissions.open(ctx, Permissions.overlayIntent(ctx)) },
            )
        }
        item {
            StepCard(
                n = 4, done = p.batteryUnrestricted, optional = true, title = "Keep it awake (recommended on Samsung)",
                body = "Pixy does no background work of its own; it only wakes when a notification arrives. Samsung can still put " +
                    "apps to sleep. In App info, set Battery to \"Unrestricted\" so tracking keeps working.",
                button = "Open App info",
                onClick = { Permissions.open(ctx, Permissions.appDetailsIntent(ctx)) },
            )
        }
        item {
            Column(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Button(onClick = onDone, enabled = p.notificationAccess, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text(if (p.notificationAccess) "Start tracking" else "Allow notification access to continue", fontSize = 16.sp)
                }
                TextButton(onClick = onDone) { Text("Skip for now") }
            }
        }
    }
}

@Composable
private fun StepCard(
    n: Int, done: Boolean, title: String, body: String,
    optional: Boolean = false, button: String? = null, onClick: () -> Unit = {},
    hint: String? = null, hintButton: String? = null, onHint: () -> Unit = {},
) {
    Group {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(28.dp).clip(CircleShape).background(if (done) Color(0xFF34B26A) else MaterialTheme.colorScheme.surfaceContainerHighest),
                    contentAlignment = Alignment.Center,
                ) { Text(if (done) "✓" else "$n", color = if (done) Color.White else MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, fontSize = 14.sp) }
                Spacer(Modifier.width(12.dp))
                Text(title, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                if (optional && !done) Text("Optional", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(body, fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (!done && button != null) {
                FilledTonalButton(onClick = onClick, modifier = Modifier.padding(top = 4.dp)) { Text(button) }
            }
            if (!done && hint != null) {
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surfaceContainerHighest).padding(14.dp)) {
                    Text(hint, fontSize = 13.sp, lineHeight = 18.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    hintButton?.let { TextButton(onClick = onHint, modifier = Modifier.align(Alignment.End)) { Text(it) } }
                }
            }
        }
    }
}
