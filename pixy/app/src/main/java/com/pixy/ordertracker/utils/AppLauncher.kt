package com.pixy.ordertracker.utils

import android.app.ActivityOptions
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.pixy.ordertracker.app
import com.pixy.ordertracker.models.Order

/** Opens the delivery app: its own tracking deep link when we still hold it, otherwise its launcher screen. */
object AppLauncher {

    fun open(context: Context, order: Order): Boolean {
        context.app.engine.contentIntentFor(order)?.let { pi -> if (send(context, pi)) return true }
        return openPackage(context, order.sourcePackage)
    }

    fun openPackage(context: Context, pkg: String): Boolean {
        val intent = context.packageManager.getLaunchIntentForPackage(pkg) ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        return runCatching { context.startActivity(intent) }.isSuccess
    }

    private fun send(context: Context, pi: PendingIntent): Boolean = try {
        // Android 14+: a PendingIntent only starts an activity from the background if the sender opts in.
        // The tap comes from our visible overlay, which the system treats as a user-initiated start.
        val options = ActivityOptions.makeBasic().apply {
            if (Build.VERSION.SDK_INT >= 36) {
                setPendingIntentBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOW_ALWAYS)
            } else if (Build.VERSION.SDK_INT >= 34) {
                @Suppress("DEPRECATION")
                setPendingIntentBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED)
            }
        }
        pi.send(context, 0, null, null, null, null, options.toBundle())
        true
    } catch (_: PendingIntent.CanceledException) {
        false
    } catch (_: SecurityException) {
        false
    }
}
