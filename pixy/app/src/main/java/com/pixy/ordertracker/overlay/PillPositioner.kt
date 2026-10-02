package com.pixy.ordertracker.overlay

import android.graphics.Rect
import android.view.Gravity
import android.view.WindowInsets
import android.view.WindowManager
import com.pixy.ordertracker.settings.PillPlacement
import kotlin.math.roundToInt

/** Where the pill window goes, computed from the live window insets (no hard-coded screen sizes). */
data class PillAnchor(val gravity: Int, val x: Int, val y: Int, val cutoutWidthPx: Int, val hugsCamera: Boolean)

object PillPositioner {
    /** Collapsed pill height in dp; the window adds [WINDOW_PADDING_DP] around it for shadow and spring overshoot. */
    const val PILL_HEIGHT_DP = 34f
    const val WINDOW_PADDING_DP = 6f

    fun compute(wm: WindowManager, placement: PillPlacement, density: Float): PillAnchor {
        val metrics = wm.currentWindowMetrics
        val bounds = metrics.bounds
        val insets = metrics.windowInsets
        val statusTop = insets.getInsetsIgnoringVisibility(WindowInsets.Type.statusBars()).top
        val pad = (WINDOW_PADDING_DP * density).roundToInt()
        val pillH = (PILL_HEIGHT_DP * density).roundToInt()
        val camera: Rect? = insets.displayCutout?.boundingRectTop?.takeIf { !it.isEmpty && it.width() < bounds.width() / 3 }

        if (placement == PillPlacement.AROUND_CAMERA && camera != null) {
            // Centre the pill on the punch-hole so the camera sits inside it.
            val y = camera.centerY() - pillH / 2 - pad
            val x = camera.centerX() - bounds.width() / 2
            return PillAnchor(Gravity.TOP or Gravity.CENTER_HORIZONTAL, x, y.coerceAtLeast(0), camera.width(), hugsCamera = true)
        }
        // Default: just under the status bar, centred under the camera if there is one.
        val x = camera?.let { it.centerX() - bounds.width() / 2 } ?: 0
        val y = statusTop + (4 * density).roundToInt() - pad
        return PillAnchor(Gravity.TOP or Gravity.CENTER_HORIZONTAL, x, y.coerceAtLeast(0), 0, hugsCamera = false)
    }
}
