package com.pixy.ordertracker.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

// One UI-like neutrals: soft grey canvas with white cards in light mode, true black with dark cards in dark mode.
private val Light = lightColorScheme(
    primary = Color(0xFF3E7BFA), onPrimary = Color.White,
    background = Color(0xFFF3F3F5), onBackground = Color(0xFF111114),
    surface = Color(0xFFF3F3F5), onSurface = Color(0xFF111114),
    surfaceContainer = Color.White, surfaceContainerHigh = Color.White, surfaceContainerHighest = Color(0xFFE9E9EC),
    onSurfaceVariant = Color(0xFF6D6D74), outlineVariant = Color(0xFFE2E2E6),
    error = Color(0xFFD93A2B),
)
private val Dark = darkColorScheme(
    primary = Color(0xFF6A9BFF), onPrimary = Color.Black,
    background = Color.Black, onBackground = Color(0xFFF2F2F4),
    surface = Color.Black, onSurface = Color(0xFFF2F2F4),
    surfaceContainer = Color(0xFF17171A), surfaceContainerHigh = Color(0xFF1E1E22), surfaceContainerHighest = Color(0xFF2A2A2F),
    onSurfaceVariant = Color(0xFF9C9CA4), outlineVariant = Color(0xFF2A2A2F),
    error = Color(0xFFFF6B5E),
)

@Composable
fun PixyTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val ctx = LocalContext.current
    // Take the accent from the wallpaper (One UI colour palette) but keep the One UI neutrals.
    val base: ColorScheme = if (dark) Dark else Light
    val dyn = if (dark) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
    val scheme = base.copy(primary = dyn.primary, onPrimary = dyn.onPrimary, primaryContainer = dyn.primaryContainer, onPrimaryContainer = dyn.onPrimaryContainer)
    MaterialTheme(colorScheme = scheme, content = content)
}
