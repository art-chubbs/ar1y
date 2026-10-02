package com.pixy.ordertracker.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pixy.ordertracker.app
import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.parsers.Apps
import com.pixy.ordertracker.ui.Group
import com.pixy.ordertracker.ui.MainViewModel
import com.pixy.ordertracker.ui.OneUiPage
import com.pixy.ordertracker.ui.Paragraph
import com.pixy.ordertracker.ui.SectionTitle
import com.pixy.ordertracker.utils.DebugEntry
import com.pixy.ordertracker.utils.DebugLog
import com.pixy.ordertracker.utils.Formatters

@Composable
fun DebugScreen(vm: MainViewModel, back: () -> Unit) {
    val ctx = LocalContext.current
    val entries by DebugLog.entries.collectAsState()
    val settings = vm.settings.collectAsState().value
    val connected by vm.listenerConnected.collectAsState()

    var appIdx by remember { mutableIntStateOf(0) }
    var title by remember { mutableStateOf("") }
    var text by remember { mutableStateOf("") }
    var preview by remember { mutableStateOf<String?>(null) }

    OneUiPage(title = "Debug", subtitle = "What the parser saw and decided. Held in memory only.", onBack = back) {
        item {
            Group {
                Paragraph(
                    "Listener: ${if (connected) "connected" else "not connected"} · Parser log: ${if (settings?.debugCapture == true) "on" else "off (turn on in Settings)"}",
                )
            }
        }
        item { SectionTitle("Try wording") }
        item {
            Group {
                Column(Modifier.padding(16.dp)) {
                    FlowRow {
                        Apps.builtIn.forEachIndexed { i, a ->
                            FilterChip(selected = i == appIdx, onClick = { appIdx = i }, label = { Text(a.displayName) }, modifier = Modifier.padding(end = 6.dp))
                        }
                    }
                    OutlinedTextField(title, { title = it }, Modifier.fillMaxWidth().padding(top = 8.dp), label = { Text("Notification title") })
                    OutlinedTextField(text, { text = it }, Modifier.fillMaxWidth().padding(top = 8.dp), label = { Text("Notification text") }, minLines = 2)
                    Row(Modifier.padding(top = 10.dp)) {
                        FilledTonalButton(onClick = {
                            val a = Apps.builtIn[appIdx]
                            val o = ctx.app.parser.parse(NotificationSnapshot(a.launchPackage, "try", System.currentTimeMillis(), title, text))
                            val r = o.result
                            preview = "App: ${o.adapter?.app?.displayName ?: "none"}\nOrder-related: ${r.isOrderRelated}\nStatus: ${r.status}\n" +
                                "ETA: ${r.eta.minutes?.let { "$it min" } ?: "none"}\nStore: ${r.merchantName ?: "-"}\nRider: ${r.riderName ?: "-"}\nItems: ${r.orderTitle ?: "-"}\nWhy: ${r.reason}"
                        }) { Text("Parse") }
                        Spacer(Modifier.width(8.dp))
                        OutlinedButton(onClick = {
                            val a = Apps.builtIn[appIdx]
                            ctx.app.engine.onSnapshot(NotificationSnapshot(a.launchPackage, "sim:try:${a.id}", System.currentTimeMillis(), title, text, isOngoing = true), null, simulated = true)
                        }) { Text("Send to tracker") }
                    }
                    preview?.let { Text(it, Modifier.padding(top = 12.dp), fontFamily = FontFamily.Monospace, fontSize = 13.sp, lineHeight = 18.sp) }
                }
            }
        }
        item { SectionTitle("Recent notifications", action = if (entries.isNotEmpty()) "Clear" else null, onAction = { DebugLog.clear() }) }
        if (entries.isEmpty()) item { Group { Paragraph("No delivery notifications captured yet.") } }
        items(entries, key = { "${it.time}-${it.packageName}-${it.title.hashCode()}-${it.simulated}" }) { e -> EntryCard(e) }
    }
}

@Composable
private fun EntryCard(e: DebugEntry) {
    Group {
        Column(Modifier.padding(16.dp)) {
            Text("${Formatters.time(e.time)} · ${e.detectedApp}${if (e.simulated) " · test" else ""}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                if (e.orderRelated) "${e.status}${e.etaMinutes?.let { " · $it min" } ?: ""}" else "Ignored",
                fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = if (e.orderRelated) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text("title: ${e.title ?: "—"}", fontFamily = FontFamily.Monospace, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
            Text("text:  ${e.text ?: "—"}", fontFamily = FontFamily.Monospace, fontSize = 12.sp)
            Text("pkg:   ${e.packageName}", fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("why:   ${e.result}", fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
