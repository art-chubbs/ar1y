package com.pixy.ordertracker.models

enum class AppCategory { FOOD, GROCERY, OTHER }

/** Static description of a supported service, shown in settings and on cards. */
data class SourceApp(
    val id: String,
    val displayName: String,
    val launchPackage: String,
    val category: AppCategory,
    val emoji: String,
    val accentArgb: Long,
)
