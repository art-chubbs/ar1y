package com.pixy.ordertracker.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pixy.ordertracker.utils.AppIdentity

/**
 * One UI-style page: a large title in the top third that fades as you scroll, then grouped cards.
 */
@Composable
fun OneUiPage(
    title: String,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    actions: @Composable () -> Unit = {},
    content: LazyListScope.() -> Unit,
) {
    val list = rememberLazyListState()
    val headerAlpha by remember { derivedStateOf { if (list.firstVisibleItemIndex > 0) 0f else (1f - list.firstVisibleItemScrollOffset / 400f).coerceIn(0f, 1f) } }
    // Surface (not a plain background) so un-coloured text picks up onBackground in light and dark mode.
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background, contentColor = MaterialTheme.colorScheme.onBackground) {
    Column(Modifier.fillMaxSize()) {
        Spacer(Modifier.windowInsetsTopHeight(WindowInsets.statusBars))
        Row(Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            if (onBack != null) TextButton(onClick = onBack) { Text("‹ Back", fontSize = 16.sp) } else Spacer(Modifier.width(8.dp))
            Text(
                title, Modifier.weight(1f).padding(start = 8.dp).graphicsLayer { alpha = 1f - headerAlpha },
                fontSize = 19.sp, fontWeight = FontWeight.SemiBold, maxLines = 1,
            )
            actions()
        }
        LazyColumn(state = list, contentPadding = PaddingValues(horizontal = 14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item(key = "header") {
                Column(Modifier.fillMaxWidth().heightIn(min = 150.dp).padding(start = 12.dp, end = 12.dp, top = 36.dp, bottom = 22.dp).graphicsLayer { alpha = headerAlpha }) {
                    Text(title, fontSize = 34.sp, fontWeight = FontWeight.Normal, lineHeight = 40.sp)
                    subtitle?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 15.sp, modifier = Modifier.padding(top = 6.dp)) }
                }
            }
            content()
            item(key = "bottom") { Spacer(Modifier.height(24.dp).windowInsetsBottomHeight(WindowInsets.navigationBars)) }
        }
    }
    }
}

@Composable
fun SectionTitle(text: String, action: String? = null, onAction: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 4.dp, top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(text, Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        if (action != null && onAction != null) TextButton(onClick = onAction) { Text(action, fontSize = 14.sp) }
    }
}

/** Rounded card group, One UI style. */
@Composable
fun Group(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(modifier.fillMaxWidth().clip(RoundedCornerShape(26.dp)).background(MaterialTheme.colorScheme.surfaceContainer)) { content() }
}

@Composable
fun GroupDivider() = HorizontalDivider(Modifier.padding(horizontal = 20.dp), thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)

@Composable
fun SwitchRow(title: String, summary: String? = null, checked: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(enabled = enabled, role = Role.Switch) { onChange(!checked) }.padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 17.sp, color = if (enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant)
            summary?.let { Text(it, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp)) }
        }
        Spacer(Modifier.width(12.dp))
        Switch(checked = checked, onCheckedChange = onChange, enabled = enabled)
    }
}

@Composable
fun ActionRow(title: String, summary: String? = null, titleColor: Color = Color.Unspecified, trailing: String? = null, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 20.dp, vertical = 15.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 17.sp, color = if (titleColor == Color.Unspecified) MaterialTheme.colorScheme.onSurface else titleColor)
            summary?.let { Text(it, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp)) }
        }
        trailing?.let { Text(it, fontSize = 14.sp, color = MaterialTheme.colorScheme.primary) }
    }
}

@Composable
fun Paragraph(text: String, modifier: Modifier = Modifier) =
    Text(text, modifier.padding(horizontal = 20.dp, vertical = 14.dp), fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

/** Delivery app icon from the launcher, or a coloured monogram when the app isn't installed. */
@Composable
fun AppAvatar(appId: String, packageName: String, size: Dp = 44.dp) {
    val ctx = LocalContext.current
    val source = remember(appId) { AppIdentity.of(ctx, appId) }
    val icon = remember(packageName) { AppIdentity.icon(ctx, packageName)?.asImageBitmap() }
    if (icon != null) {
        Image(icon, source.displayName, Modifier.size(size).clip(CircleShape))
    } else {
        val c = Color(source.accentArgb)
        Box(Modifier.size(size).clip(CircleShape).background(c), contentAlignment = Alignment.Center) {
            Text(source.displayName.take(1), color = if (c.luminance() > 0.55f) Color.Black else Color.White, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.42f).sp)
        }
    }
}

/** Warning card shown when something needed is switched off. */
@Composable
fun Banner(title: String, body: String, button: String, onClick: () -> Unit) {
    Group {
        Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 18.dp, bottom = 8.dp)) {
            Text(title, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.error)
            Text(body, fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp), overflow = TextOverflow.Clip)
            TextButton(onClick = onClick, modifier = Modifier.align(Alignment.End)) { Text(button, fontSize = 15.sp, fontWeight = FontWeight.SemiBold) }
        }
    }
}
