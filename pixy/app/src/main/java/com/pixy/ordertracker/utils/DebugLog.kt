package com.pixy.ordertracker.utils

import android.util.Log
import com.pixy.ordertracker.BuildConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update

/** One parsed notification, kept in memory only while debug capture is on. */
data class DebugEntry(
    val time: Long,
    val packageName: String,
    val title: String?,
    val text: String?,
    val detectedApp: String,
    val status: String,
    val etaMinutes: Int?,
    val orderRelated: Boolean,
    val result: String,
    val simulated: Boolean,
)

/**
 * Parser log for the debug screen: a small in-memory ring buffer, never written to disk or sent anywhere.
 * Logcat output is debug-builds only (release builds also strip android.util.Log via R8).
 */
object DebugLog {
    private const val MAX = 60
    private val _entries = MutableStateFlow<List<DebugEntry>>(emptyList())
    val entries: StateFlow<List<DebugEntry>> = _entries

    fun add(entry: DebugEntry) = _entries.update { (listOf(entry) + it).take(MAX) }
    fun clear() { _entries.value = emptyList() }

    fun d(tag: String, msg: String) { if (BuildConfig.DEBUG) Log.d("Pixy/$tag", msg) }
    fun w(tag: String, msg: String, t: Throwable? = null) { if (BuildConfig.DEBUG) Log.w("Pixy/$tag", msg, t) }
}
