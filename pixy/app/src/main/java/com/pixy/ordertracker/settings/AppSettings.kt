package com.pixy.ordertracker.settings

import com.pixy.ordertracker.parsers.Apps

enum class AnimationLevel(val label: String) { FULL("Full"), REDUCED("Reduced"), OFF("Off") }

/** Where the floating pill sits. */
enum class PillPlacement(val label: String, val detail: String) {
    BELOW_STATUS_BAR("Below status bar", "Always tappable. Recommended."),
    AROUND_CAMERA("Around the camera", "Hugs the punch-hole. The status bar is drawn above app overlays, so taps there may pull down the shade."),
}

data class AppSettings(
    val onboardingDone: Boolean = false,
    val trackerEnabled: Boolean = true,
    val liveNotificationEnabled: Boolean = false,
    val animationLevel: AnimationLevel = AnimationLevel.FULL,
    val showEta: Boolean = true,
    val autoHideDelivered: Boolean = true,
    val placement: PillPlacement = PillPlacement.BELOW_STATUS_BAR,
    val enabledApps: Set<String> = Apps.builtIn.map { it.id }.toSet(),
    /** Extra apps added by the user: package name -> label. Parsed with the generic adapter. */
    val customApps: Map<String, String> = emptyMap(),
    /** In-memory parser log for the debug screen. Never persisted. */
    val debugCapture: Boolean = false,
) {
    fun isAppEnabled(id: String) = id in enabledApps
}
