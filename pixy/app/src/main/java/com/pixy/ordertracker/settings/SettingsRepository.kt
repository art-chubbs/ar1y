package com.pixy.ordertracker.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.pixy.ordertracker.BuildConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class SettingsRepository(private val context: Context) {
    private object K {
        val onboarding = booleanPreferencesKey("onboarding_done")
        val tracker = booleanPreferencesKey("tracker_enabled")
        val live = booleanPreferencesKey("live_notification")
        val anim = stringPreferencesKey("animation_level")
        val eta = booleanPreferencesKey("show_eta")
        val autoHide = booleanPreferencesKey("auto_hide_delivered")
        val placement = stringPreferencesKey("placement")
        val enabled = stringSetPreferencesKey("enabled_apps")
        val custom = stringSetPreferencesKey("custom_apps")
        val debug = booleanPreferencesKey("debug_capture")
    }

    val settings: Flow<AppSettings> = context.dataStore.data.map { p ->
        val d = AppSettings()
        AppSettings(
            onboardingDone = p[K.onboarding] ?: d.onboardingDone,
            trackerEnabled = p[K.tracker] ?: d.trackerEnabled,
            liveNotificationEnabled = p[K.live] ?: d.liveNotificationEnabled,
            animationLevel = p[K.anim]?.let { runCatching { AnimationLevel.valueOf(it) }.getOrNull() } ?: d.animationLevel,
            showEta = p[K.eta] ?: d.showEta,
            autoHideDelivered = p[K.autoHide] ?: d.autoHideDelivered,
            placement = p[K.placement]?.let { runCatching { PillPlacement.valueOf(it) }.getOrNull() } ?: d.placement,
            enabledApps = p[K.enabled] ?: d.enabledApps,
            customApps = (p[K.custom] ?: emptySet()).mapNotNull { e -> e.split('|', limit = 2).takeIf { it.size == 2 }?.let { it[0] to it[1] } }.toMap(),
            debugCapture = p[K.debug] ?: BuildConfig.DEBUG,
        )
    }

    suspend fun setOnboardingDone(v: Boolean) = context.dataStore.edit { it[K.onboarding] = v }
    suspend fun setTrackerEnabled(v: Boolean) = context.dataStore.edit { it[K.tracker] = v }
    suspend fun setLiveNotification(v: Boolean) = context.dataStore.edit { it[K.live] = v }
    suspend fun setAnimationLevel(v: AnimationLevel) = context.dataStore.edit { it[K.anim] = v.name }
    suspend fun setShowEta(v: Boolean) = context.dataStore.edit { it[K.eta] = v }
    suspend fun setAutoHideDelivered(v: Boolean) = context.dataStore.edit { it[K.autoHide] = v }
    suspend fun setPlacement(v: PillPlacement) = context.dataStore.edit { it[K.placement] = v.name }
    suspend fun setDebugCapture(v: Boolean) = context.dataStore.edit { it[K.debug] = v }

    suspend fun setAppEnabled(id: String, enabled: Boolean) = context.dataStore.edit { p ->
        val cur = p[K.enabled] ?: AppSettings().enabledApps
        p[K.enabled] = if (enabled) cur + id else cur - id
    }

    suspend fun addCustomApp(pkg: String, label: String, appId: String) = context.dataStore.edit { p ->
        p[K.custom] = (p[K.custom] ?: emptySet()).filterNot { it.startsWith("$pkg|") }.toSet() + "$pkg|${label.replace('|', ' ')}"
        p[K.enabled] = (p[K.enabled] ?: AppSettings().enabledApps) + appId
    }

    suspend fun removeCustomApp(pkg: String, appId: String) = context.dataStore.edit { p ->
        p[K.custom] = (p[K.custom] ?: emptySet()).filterNot { it.startsWith("$pkg|") }.toSet()
        p[K.enabled] = (p[K.enabled] ?: AppSettings().enabledApps) - appId
    }
}
