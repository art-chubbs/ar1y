package com.pixy.ordertracker.ui.screens

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pixy.ordertracker.BuildConfig
import com.pixy.ordertracker.parsers.Apps
import com.pixy.ordertracker.settings.AnimationLevel
import com.pixy.ordertracker.settings.PillPlacement
import com.pixy.ordertracker.ui.ActionRow
import com.pixy.ordertracker.ui.AppAvatar
import com.pixy.ordertracker.ui.Group
import com.pixy.ordertracker.ui.GroupDivider
import com.pixy.ordertracker.ui.InstalledApp
import com.pixy.ordertracker.ui.MainViewModel
import com.pixy.ordertracker.ui.OneUiPage
import com.pixy.ordertracker.ui.Paragraph
import com.pixy.ordertracker.ui.Route
import com.pixy.ordertracker.ui.SectionTitle
import com.pixy.ordertracker.ui.SwitchRow
import com.pixy.ordertracker.utils.AppIdentity
import com.pixy.ordertracker.utils.Permissions

@Composable
fun SettingsScreen(vm: MainViewModel, go: (Route) -> Unit, back: () -> Unit) {
    val ctx = LocalContext.current
    val s = vm.settings.collectAsState().value ?: return
    val p by vm.permissions.collectAsState()
    var confirmClear by remember { mutableStateOf(false) }
    var deniedNotice by remember { mutableStateOf(false) }
    val askNotifications = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        vm.refreshPermissions()
        if (granted) vm.setLive(true) else deniedNotice = true
    }

    OneUiPage(title = "Settings", onBack = back) {
        item { SectionTitle("General") }
        item {
            Group {
                SwitchRow("Floating tracker", if (p.overlay) "Show the order pill at the top of the screen" else "Needs \"Display over other apps\"", s.trackerEnabled) { on ->
                    vm.setTracker(on)
                    if (on && !p.overlay) Permissions.open(ctx, Permissions.overlayIntent(ctx))
                }
                GroupDivider()
                SwitchRow(
                    "Order notifications",
                    "A quiet ongoing notification per order. On Android 16 it is sent as a Live Update. Off by default because the delivery apps already notify you.",
                    s.liveNotificationEnabled && p.postNotifications,
                ) { on ->
                    if (!on) vm.setLive(false)
                    else if (p.postNotifications) vm.setLive(true)
                    else if (android.os.Build.VERSION.SDK_INT >= 33) askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)   // asked only now, when needed
                    else Permissions.open(ctx, Permissions.appDetailsIntent(ctx))   // Android 12: notifications switched off in Settings
                }
                GroupDivider()
                SwitchRow("Show ETA", "Only ever the time the delivery app gave; never estimated by Pixy", s.showEta, onChange = vm::setShowEta)
                GroupDivider()
                SwitchRow("Auto-hide delivered orders", "Show \"Delivered\" for a moment, then disappear", s.autoHideDelivered, onChange = vm::setAutoHide)
            }
        }
        item {
            Group {
                Column(Modifier.padding(20.dp)) {
                    Text("Animation intensity", fontSize = 17.sp)
                    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(top = 12.dp)) {
                        AnimationLevel.entries.forEachIndexed { i, level ->
                            SegmentedButton(
                                selected = s.animationLevel == level, onClick = { vm.setAnimation(level) },
                                shape = SegmentedButtonDefaults.itemShape(i, AnimationLevel.entries.size),
                            ) { Text(level.label) }
                        }
                    }
                }
            }
        }
        item {
            Group {
                Text("Tracker position", Modifier.padding(start = 20.dp, top = 18.dp, bottom = 4.dp), fontSize = 17.sp)
                PillPlacement.entries.forEach { pl ->
                    Row(Modifier.fillMaxWidth().clickable { vm.setPlacement(pl) }.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = s.placement == pl, onClick = { vm.setPlacement(pl) })
                        Column(Modifier.weight(1f)) {
                            Text(pl.label, fontSize = 16.sp)
                            Text(pl.detail, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                Spacer(Modifier.padding(4.dp))
            }
        }

        item { SectionTitle("Supported apps") }
        item {
            Group {
                Apps.builtIn.forEachIndexed { i, a ->
                    if (i > 0) GroupDivider()
                    val installed = AppIdentity.isInstalled(ctx, a.launchPackage)
                    AppToggle(a.id, a.launchPackage, a.displayName, if (installed) "Installed" else "Not installed", s.isAppEnabled(a.id)) { vm.setAppEnabled(a.id, it) }
                }
                s.customApps.forEach { (pkg, label) ->
                    GroupDivider()
                    val id = Apps.CUSTOM_PREFIX + pkg
                    AppToggle(id, pkg, label, "Added by you · generic parser · tap × to remove", s.isAppEnabled(id), onRemove = { vm.removeCustomApp(pkg) }) { vm.setAppEnabled(id, it) }
                }
                GroupDivider()
                ActionRow("Add another app", "Track any delivery app with the generic parser", trailing = "Add") { go(Route.AddApp) }
            }
        }

        item { SectionTitle("Privacy") }
        item {
            Group {
                Paragraph(
                    "Everything happens on this phone. Pixy has no internet permission, no account, no analytics and no ads. " +
                        "Notifications from apps not listed above are dropped before their text is read. From delivery apps it keeps only " +
                        "the order status, ETA, store and rider first name, never the notification text. Nothing is included in backups.",
                )
                GroupDivider()
                ActionRow("Clear stored orders", "Deletes all active and past orders from this phone", titleColor = MaterialTheme.colorScheme.error) { confirmClear = true }
            }
        }

        item { SectionTitle("Permissions") }
        item {
            Group {
                ActionRow("Notification access", if (p.notificationAccess) "Allowed" else "Required to detect orders", trailing = if (p.notificationAccess) null else "Allow") {
                    Permissions.open(ctx, Permissions.notificationAccessIntent(ctx), Permissions.notificationAccessFallback())
                }
                GroupDivider()
                ActionRow("Display over other apps", if (p.overlay) "Allowed" else "Required for the floating tracker", trailing = if (p.overlay) null else "Allow") {
                    Permissions.open(ctx, Permissions.overlayIntent(ctx))
                }
                GroupDivider()
                ActionRow("Battery", if (p.batteryUnrestricted) "Unrestricted" else "Recommended: set to Unrestricted in App info") { Permissions.open(ctx, Permissions.appDetailsIntent(ctx)) }
            }
        }

        item { SectionTitle("Developer") }
        item {
            Group {
                SwitchRow("Parser log", "Keeps the last 60 delivery notifications in memory for the debug screen. Never saved.", s.debugCapture, onChange = vm::setDebugCapture)
                GroupDivider()
                ActionRow("Debug screen", "Raw text, detected app, parsed status and ETA") { go(Route.Debug) }
                GroupDivider()
                ActionRow("Test mode", "Simulate orders without placing them") { go(Route.TestMode) }
            }
        }
        item { Text("Pixy ${BuildConfig.VERSION_NAME}", Modifier.fillMaxWidth().padding(16.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp) }
    }

    if (confirmClear) AlertDialog(
        onDismissRequest = { confirmClear = false },
        title = { Text("Clear all stored orders?") },
        text = { Text("Active and past orders are deleted from this phone. The floating tracker disappears until the next order update.") },
        confirmButton = { TextButton(onClick = { vm.clearAll(); confirmClear = false }) { Text("Clear all") } },
        dismissButton = { TextButton(onClick = { confirmClear = false }) { Text("Cancel") } },
    )
    if (deniedNotice) AlertDialog(
        onDismissRequest = { deniedNotice = false },
        title = { Text("Notifications are off for Pixy") },
        text = { Text("Order notifications need permission to post notifications. You can allow it later in App info → Notifications. The floating tracker works without it.") },
        confirmButton = { TextButton(onClick = { deniedNotice = false; Permissions.open(ctx, Permissions.appDetailsIntent(ctx)) }) { Text("App info") } },
        dismissButton = { TextButton(onClick = { deniedNotice = false }) { Text("OK") } },
    )
}

@Composable
private fun AppToggle(id: String, pkg: String, name: String, summary: String, checked: Boolean, onRemove: (() -> Unit)? = null, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().clickable { onChange(!checked) }.padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        AppAvatar(id, pkg, 36.dp)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(name, fontSize = 17.sp)
            Text(summary, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        onRemove?.let { TextButton(onClick = it) { Text("×", fontSize = 20.sp) } }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
fun AddAppScreen(vm: MainViewModel, back: () -> Unit) {
    var apps by remember { mutableStateOf<List<InstalledApp>?>(null) }
    var query by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { apps = vm.installedApps() }
    val shown = apps.orEmpty().filter { query.isBlank() || it.label.contains(query, true) || it.packageName.contains(query, true) }

    OneUiPage(title = "Add an app", subtitle = "Pick a delivery or shopping app. Its notifications will be read with the generic parser.", onBack = back) {
        item {
            OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), placeholder = { Text("Search apps") }, singleLine = true)
        }
        if (apps == null) item { Group { Paragraph("Loading apps…") } }
        items(shown, key = { it.packageName }) { a ->
            Group {
                Row(Modifier.fillMaxWidth().clickable { vm.addCustomApp(a); back() }.padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    AppAvatar(Apps.CUSTOM_PREFIX + a.packageName, a.packageName, 36.dp)
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(a.label, fontSize = 16.sp)
                        Text(a.packageName, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}
