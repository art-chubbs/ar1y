package com.pixy.ordertracker.overlay

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.settings.AnimationLevel

// The pill is always near-black so it blends with the camera hole, in light and dark mode alike.
private val PillBlack = Color(0xFF050505)
private val Muted = Color(0xFF9A9AA0)
private val Live = Color(0xFF5BD68E)
private val Bad = Color(0xFFFF6B5E)

/** Motion presets for the "Animation intensity" setting. */
private class Motion(val level: AnimationLevel) {
    fun <T> size(): FiniteAnimationSpec<T> = when (level) {
        AnimationLevel.FULL -> spring(dampingRatio = 0.74f, stiffness = 380f)
        AnimationLevel.REDUCED -> spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = 600f)
        AnimationLevel.OFF -> snap()
    }
    fun <T> fade(ms: Int = 220): FiniteAnimationSpec<T> = if (level == AnimationLevel.OFF) snap() else tween(if (level == AnimationLevel.REDUCED) ms / 2 else ms)
    val enterScale get() = if (level == AnimationLevel.FULL) 0.55f else 0.9f
}

@Composable
fun Island(state: IslandUi, actions: IslandActions) {
    val motion = remember(state.animation) { Motion(state.animation) }
    val shown = remember { MutableTransitionState(false) }
    shown.targetState = state.visible && (state.items.isNotEmpty() || state.finale != null)

    Box(Modifier.padding(PillPositioner.WINDOW_PADDING_DP.dp)) {
        AnimatedVisibility(
            visibleState = shown,
            enter = scaleIn(motion.size(), initialScale = motion.enterScale, transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0f)) + fadeIn(motion.fade(180)),
            exit = scaleOut(motion.size(), targetScale = motion.enterScale, transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0f)) + fadeOut(motion.fade(160)),
        ) {
            PillSurface(state, actions, motion)
        }
    }
}

private enum class Face { COMPACT, PEEK, EXPANDED, FINALE }

@Composable
private fun PillSurface(state: IslandUi, actions: IslandActions, motion: Motion) {
    val face = when {
        state.finale != null && state.mode != IslandMode.EXPANDED -> Face.FINALE
        state.items.isEmpty() && state.finale != null -> Face.FINALE
        state.mode == IslandMode.EXPANDED -> Face.EXPANDED
        state.mode == IslandMode.PEEK -> Face.PEEK
        else -> Face.COMPACT
    }
    val haptics = LocalHapticFeedback.current
    val corner by animateDpAsState(if (face == Face.EXPANDED) 30.dp else 22.dp, motion.size(), label = "corner")
    val elevation by animateDpAsState(if (face == Face.EXPANDED) 18.dp else 6.dp, motion.size(), label = "elevation")
    val shape = RoundedCornerShape(corner)

    // A short squash-and-settle whenever an order changes, so updates are felt without being loud.
    val pulse = remember { Animatable(1f) }
    LaunchedEffect(state.pulse) {
        if (state.pulse > 0 && state.animation == AnimationLevel.FULL) {
            pulse.animateTo(1.07f, spring(dampingRatio = 0.5f, stiffness = 900f))
            pulse.animateTo(1f, spring(dampingRatio = 0.6f, stiffness = 300f))
        }
    }
    val swipeThreshold = with(LocalDensity.current) { 22.dp.toPx() }

    var gestures = Modifier
        .pointerInput(face, state.primary?.orderId) {
            detectTapGestures(
                onTap = { haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove); actions.onTap() },
                onLongPress = { state.primary?.let { haptics.performHapticFeedback(HapticFeedbackType.LongPress); actions.onDetails(it) } },
            )
        }
    gestures = gestures.pointerInput(Unit) {
        var dy = 0f
        detectVerticalDragGestures(
            onDragStart = { dy = 0f },
            onDragEnd = { if (dy < -swipeThreshold) actions.onDismiss() else if (dy > swipeThreshold) actions.onTap() },
            onVerticalDrag = { change, amount -> dy += amount; change.consume() },
        )
    }

    Box(
        Modifier
            .graphicsLayer { scaleX = pulse.value; scaleY = pulse.value; transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0f) }
            .shadow(elevation, shape, ambientColor = Color.Black, spotColor = Color.Black)
            .clip(shape)
            .background(PillBlack)
            .border(0.5.dp, Color.White.copy(alpha = 0.09f), shape)
            .then(if (face == Face.EXPANDED) Modifier else gestures)
            .semantics { contentDescription = state.primary?.let { "${it.appName}: ${it.statusLine}" } ?: "Order tracker" },
    ) {
        AnimatedContent(
            targetState = face,
            transitionSpec = {
                val t: ContentTransform = (fadeIn(motion.fade(240)) + scaleIn(motion.size(), initialScale = 0.92f)) togetherWith fadeOut(motion.fade(120))
                t using SizeTransform(clip = true) { _: IntSize, _: IntSize -> motion.size() }
            },
            contentAlignment = Alignment.TopCenter,
            label = "face",
        ) { f ->
            when (f) {
                Face.COMPACT -> Compact(state, motion)
                Face.PEEK -> Peek(state, motion)
                Face.EXPANDED -> Expanded(state, actions, motion)
                Face.FINALE -> Finale(state)
            }
        }
    }
}

// ---------- faces ----------

@Composable
private fun Compact(state: IslandUi, motion: Motion) {
    val item = state.primary ?: return
    val label = (if (state.showEta) item.etaShort else null) ?: shortStatus(item.status)
    Row(
        Modifier.height(PillPositioner.PILL_HEIGHT_DP.dp).padding(start = 6.dp, end = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppIcon(item, 22.dp)
        // Leave room for the punch-hole when the pill wraps the camera.
        Spacer(Modifier.width(if (state.hugsCamera) (state.cutoutWidthDp + 14f).dp else 8.dp))
        Ticker(label, motion, TextStyle(color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold))
        val others = state.items.filter { it.orderId != item.orderId }
        if (others.isNotEmpty()) {
            Spacer(Modifier.width(8.dp))
            Box {
                others.take(2).forEachIndexed { i, o -> Box(Modifier.padding(start = (i * 10).dp)) { AppIcon(o, 16.dp, ring = true) } }
            }
            if (others.size > 2) Text("+${others.size - 2}", Muted, 11.sp, Modifier.padding(start = 4.dp))
        }
    }
}

@Composable
private fun Peek(state: IslandUi, motion: Motion) {
    val item = state.primary ?: return
    Row(
        Modifier.height(48.dp).widthIn(min = 240.dp, max = 340.dp).padding(start = 8.dp, end = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppIcon(item, 30.dp)
        Spacer(Modifier.width(if (state.hugsCamera) 10.dp else 10.dp))
        Column(Modifier.weight(1f, fill = false)) {
            Text(listOfNotNull(item.appName, item.merchant).joinToString(" · "), Muted, 11.sp, maxLines = 1)
            Ticker(item.statusLine, motion, TextStyle(color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold))
        }
        if (state.showEta) item.etaShort?.let {
            Spacer(Modifier.width(12.dp))
            Ticker(it, motion, TextStyle(color = Live, fontSize = 14.sp, fontWeight = FontWeight.SemiBold))
        }
    }
}

@Composable
private fun Expanded(state: IslandUi, actions: IslandActions, motion: Motion) {
    Column(
        Modifier.width(344.dp).padding(horizontal = 18.dp, vertical = 16.dp)
            .pointerInput(Unit) { detectTapGestures(onTap = { actions.onCollapse() }) },
    ) {
        if (state.items.size == 1) SingleOrder(state.items[0], state, actions, motion)
        else if (state.items.isEmpty()) state.finale?.let { FinaleRow(it) }
        else MultiOrder(state, actions, motion)
    }
}

@Composable
private fun SingleOrder(item: IslandItem, state: IslandUi, actions: IslandActions, motion: Motion) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        AppIcon(item, 38.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(item.appName, Muted, 12.sp)
            Text(item.merchant ?: item.title ?: "Your order", Color.White, 17.sp, weight = FontWeight.SemiBold, maxLines = 1)
            if (item.merchant != null && item.title != null) Text(item.title, Muted, 12.sp, maxLines = 1)
        }
    }
    Spacer(Modifier.height(14.dp))
    Ticker(item.statusLine, motion, TextStyle(color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Medium))
    val eta = if (state.showEta) item.etaLong else null
    Text(eta ?: if (item.status == OrderStatus.UNKNOWN) "Order in progress" else "No ETA from ${item.appName} yet", if (eta != null) Live else Muted, 13.sp)
    Spacer(Modifier.height(12.dp))
    StepBar(item.status, item.accent, motion)
    Spacer(Modifier.height(14.dp))
    val onAccent = if (item.accent.luminance() > 0.55f) Color(0xFF111111) else Color.White
    Box(
        Modifier.fillMaxWidth().height(42.dp).clip(RoundedCornerShape(21.dp)).background(item.accent)
            .combinedClickable(onClick = { actions.onOpen(item) }, onLongClick = { actions.onDetails(item) }),
        contentAlignment = Alignment.Center,
    ) { Text("Open ${item.appName}", onAccent, 14.sp, weight = FontWeight.SemiBold) }
}

@Composable
private fun MultiOrder(state: IslandUi, actions: IslandActions, motion: Motion) {
    Text("${state.items.size} active orders", Muted, 12.sp, Modifier.padding(bottom = 6.dp))
    state.items.forEachIndexed { i, item ->
        if (i > 0) Box(Modifier.fillMaxWidth().height(0.5.dp).background(Color.White.copy(alpha = 0.08f)))
        Row(
            Modifier.fillMaxWidth().heightIn(min = 54.dp).clip(RoundedCornerShape(14.dp))
                .combinedClickable(onClick = { actions.onOpen(item) }, onLongClick = { actions.onDetails(item) })
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppIcon(item, 30.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(listOfNotNull(item.appName, item.merchant).joinToString(" — "), Color.White, 14.sp, weight = FontWeight.SemiBold, maxLines = 1)
                Ticker(item.statusLine, motion, TextStyle(color = Muted, fontSize = 12.sp))
            }
            val eta = if (state.showEta) item.etaShort else null
            Text(eta ?: shortStatus(item.status), if (eta != null) Live else Muted, 13.sp, weight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun Finale(state: IslandUi) {
    val item = state.finale ?: return
    Box(Modifier.height(44.dp).padding(start = 8.dp, end = 16.dp), contentAlignment = Alignment.Center) { FinaleRow(item) }
}

@Composable
private fun FinaleRow(item: IslandItem) {
    val ok = item.status == OrderStatus.DELIVERED
    Row(verticalAlignment = Alignment.CenterVertically) {
        val draw = remember { Animatable(0f) }
        LaunchedEffect(item.orderId) { draw.animateTo(1f, tween(420)) }
        Canvas(Modifier.size(26.dp)) {
            drawCircle(if (ok) Live else Bad)
            val w = size.width
            val stroke = Stroke(width = w * 0.11f, cap = StrokeCap.Round)
            if (ok) {
                val p1 = Offset(w * 0.28f, w * 0.52f); val p2 = Offset(w * 0.44f, w * 0.68f); val p3 = Offset(w * 0.74f, w * 0.36f)
                val t = draw.value
                if (t <= 0.4f) drawLine(Color.Black, p1, lerp(p1, p2, t / 0.4f), stroke.width, StrokeCap.Round)
                else { drawLine(Color.Black, p1, p2, stroke.width, StrokeCap.Round); drawLine(Color.Black, p2, lerp(p2, p3, (t - 0.4f) / 0.6f), stroke.width, StrokeCap.Round) }
            } else {
                drawLine(Color.Black, Offset(w * 0.34f, w * 0.34f), Offset(w * 0.66f, w * 0.66f), stroke.width, StrokeCap.Round)
                drawLine(Color.Black, Offset(w * 0.66f, w * 0.34f), Offset(w * 0.34f, w * 0.66f), stroke.width, StrokeCap.Round)
            }
        }
        Spacer(Modifier.width(10.dp))
        Text(item.status.label, Color.White, 14.sp, weight = FontWeight.SemiBold)
        Spacer(Modifier.width(8.dp))
        Text(item.appName, Muted, 13.sp)
    }
}

// ---------- pieces ----------

/** Text that slides up when its value changes (status updates, ETA ticks). */
@Composable
private fun Ticker(text: String, motion: Motion, style: TextStyle) {
    AnimatedContent(
        targetState = text,
        transitionSpec = {
            (slideInVertically(motion.size()) { it / 2 } + fadeIn(motion.fade(200))) togetherWith
                (slideOutVertically(motion.size()) { -it / 2 } + fadeOut(motion.fade(120))) using SizeTransform(clip = false)
        },
        label = "ticker",
    ) { t -> androidx.compose.material3.Text(t, style = style, maxLines = 1, overflow = TextOverflow.Ellipsis) }
}

@Composable
private fun AppIcon(item: IslandItem, size: Dp, ring: Boolean = false) {
    val m = Modifier.size(size).clip(CircleShape).then(if (ring) Modifier.border(1.5.dp, PillBlack, CircleShape) else Modifier)
    if (item.icon != null) {
        Image(item.icon, contentDescription = item.appName, modifier = m)
    } else {
        Box(m.background(item.accent), contentAlignment = Alignment.Center) {
            Text(item.appName.take(1), if (item.accent.luminance() > 0.55f) Color.Black else Color.White, (size.value * 0.45f).sp, weight = FontWeight.Bold)
        }
    }
}

/** Five-step progress: confirmed, preparing, picked up, on the way, arriving. */
@Composable
private fun StepBar(status: OrderStatus, accent: Color, motion: Motion) {
    val filled = when (status) {
        OrderStatus.UNKNOWN -> 0; OrderStatus.CONFIRMED -> 1; OrderStatus.PREPARING, OrderStatus.READY -> 2
        OrderStatus.PICKED_UP -> 3; OrderStatus.OUT_FOR_DELIVERY -> 4; else -> 5
    }
    val progress by animateFloatAsState(filled.toFloat(), motion.size(), label = "steps")
    Row(Modifier.fillMaxWidth().height(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        repeat(5) { i ->
            val f = (progress - i).coerceIn(0f, 1f)
            Canvas(Modifier.weight(1f).height(4.dp)) {
                drawRoundRect(Color.White.copy(alpha = 0.14f), cornerRadius = CornerRadius(size.height / 2))
                if (f > 0f) drawRoundRect(accent, size = size.copy(width = size.width * f), cornerRadius = CornerRadius(size.height / 2))
            }
        }
    }
}

@Composable
private fun Text(text: String, color: Color, size: androidx.compose.ui.unit.TextUnit, modifier: Modifier = Modifier, weight: FontWeight = FontWeight.Normal, maxLines: Int = 1) =
    androidx.compose.material3.Text(text, modifier, color = color, fontSize = size, fontWeight = weight, maxLines = maxLines, overflow = TextOverflow.Ellipsis)

private fun shortStatus(s: OrderStatus): String = when (s) {
    OrderStatus.UNKNOWN -> "In progress"
    OrderStatus.CONFIRMED -> "Confirmed"
    OrderStatus.PREPARING -> "Preparing"
    OrderStatus.READY -> "Ready"
    OrderStatus.PICKED_UP -> "Picked up"
    OrderStatus.OUT_FOR_DELIVERY -> "On the way"
    OrderStatus.ARRIVING -> "Arriving"
    else -> s.label
}

private fun lerp(a: Offset, b: Offset, t: Float) = Offset(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
