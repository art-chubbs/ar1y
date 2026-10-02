package com.pixy.ordertracker.utils

import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import androidx.core.graphics.drawable.toBitmap
import com.pixy.ordertracker.app
import com.pixy.ordertracker.models.SourceApp
import com.pixy.ordertracker.parsers.Apps
import java.util.concurrent.ConcurrentHashMap

/** Display name, icon and install state for a service id ("swiggy", "pkg:com.zeptoconsumerapp"). */
object AppIdentity {
    private val icons = ConcurrentHashMap<String, Bitmap>()
    private val missing = ConcurrentHashMap.newKeySet<String>()

    fun of(context: Context, appId: String): SourceApp {
        Apps.builtIn.firstOrNull { it.id == appId }?.let { return it }
        if (appId.startsWith(Apps.CUSTOM_PREFIX)) {
            val pkg = appId.removePrefix(Apps.CUSTOM_PREFIX)
            context.app.registry.byId(appId)?.let { return it.app }
            return Apps.custom(pkg, label(context, pkg) ?: pkg)
        }
        return Apps.custom(appId, appId)
    }

    fun label(context: Context, pkg: String): String? = runCatching {
        val pm = context.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
    }.getOrNull()

    fun isInstalled(context: Context, pkg: String): Boolean = try {
        context.packageManager.getApplicationInfo(pkg, 0); true
    } catch (_: PackageManager.NameNotFoundException) { false }

    /** App icon from the launcher, cached in memory; null if the app is not installed (UI falls back to the emoji). */
    fun icon(context: Context, pkg: String, sizePx: Int = 96): Bitmap? {
        icons[pkg]?.let { return it }
        if (pkg in missing) return null
        return runCatching { context.packageManager.getApplicationIcon(pkg).toBitmap(sizePx, sizePx) }
            .onSuccess { icons[pkg] = it }
            .onFailure { missing += pkg }
            .getOrNull()
    }

    fun forget() { icons.clear(); missing.clear() }
}
