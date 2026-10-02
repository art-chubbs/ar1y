package com.pixy.ordertracker.models

/**
 * The parts of a posted notification the parsers look at. Built in memory from a StatusBarNotification,
 * parsed, and then dropped; only the resulting order fields are persisted.
 */
data class NotificationSnapshot(
    val packageName: String,
    val key: String,
    val postTime: Long,
    val title: String? = null,
    val text: String? = null,
    val bigText: String? = null,
    val subText: String? = null,
    val infoText: String? = null,
    val summaryText: String? = null,
    val textLines: List<String> = emptyList(),
    val tickerText: String? = null,
    val isOngoing: Boolean = false,
    val category: String? = null,
    val isGroupSummary: Boolean = false,
) {
    /** All visible text, de-duplicated, title first. */
    val combinedText: String
        get() = buildList {
            title?.let(::add); bigText?.let(::add); text?.let(::add)
            addAll(textLines); subText?.let(::add); infoText?.let(::add); summaryText?.let(::add); tickerText?.let(::add)
        }.map { it.trim() }.filter { it.isNotEmpty() }
            .fold(mutableListOf<String>()) { acc, s -> if (acc.none { it.contains(s, ignoreCase = true) }) acc.add(s); acc }
            .joinToString("\n")
}
