package com.pixy.ordertracker.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pixy.ordertracker.app
import com.pixy.ordertracker.domain.Simulator
import com.pixy.ordertracker.parsers.Apps
import com.pixy.ordertracker.ui.AppAvatar
import com.pixy.ordertracker.ui.Banner
import com.pixy.ordertracker.ui.Group
import com.pixy.ordertracker.ui.MainViewModel
import com.pixy.ordertracker.ui.OneUiPage
import com.pixy.ordertracker.ui.Paragraph
import com.pixy.ordertracker.ui.SectionTitle
import com.pixy.ordertracker.utils.Permissions

@Composable
fun TestModeScreen(vm: MainViewModel, back: () -> Unit) {
    val ctx = LocalContext.current
    val sim = ctx.app.simulator
    val p by vm.permissions.collectAsState()

    OneUiPage(title = "Test mode", subtitle = "Sample notifications go through the real parser and tracker. Nothing is ordered.", onBack = back) {
        if (!p.overlay) item {
            Banner("The floating tracker can't appear yet", "Allow \"Display over other apps\" to see the pill while testing.", "Allow") {
                Permissions.open(ctx, Permissions.overlayIntent(ctx))
            }
        }
        item { SectionTitle("Scenarios") }
        item {
            Group {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(onClick = { sim.playJourney(Apps.SWIGGY) }, modifier = Modifier.fillMaxWidth()) { Text("Play a Swiggy order, start to finish") }
                    Button(onClick = { sim.playJourney(Apps.SWIGGY, Apps.BLINKIT) }, modifier = Modifier.fillMaxWidth()) { Text("Two orders at once (Swiggy + Blinkit)") }
                    Row {
                        OutlinedButton(onClick = { sim.stop() }, modifier = Modifier.weight(1f)) { Text("Stop") }
                        Spacer(Modifier.width(10.dp))
                        OutlinedButton(onClick = { sim.stop(); vm.clearTestOrders() }, modifier = Modifier.weight(1f)) { Text("Clear test orders") }
                    }
                }
            }
        }
        item { SectionTitle("One step at a time") }
        items(Apps.builtIn, key = { it.id }) { a ->
            Group {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AppAvatar(a.id, a.launchPackage, 32.dp)
                        Spacer(Modifier.width(12.dp))
                        Text(a.displayName, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                        TextButton(onClick = { sim.playJourney(a) }) { Text("Play") }
                    }
                    FlowRow(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Simulator.Step.entries.forEach { step ->
                            AssistChip(onClick = { sim.post(a, step) }, label = { Text("${a.displayName} — ${step.label}") })
                        }
                    }
                }
            }
        }
        item { Group { Paragraph("Test orders are marked \"Test\" in Recent orders. A step that would move an order backwards is ignored, just like a real late notification.") } }
    }
}
