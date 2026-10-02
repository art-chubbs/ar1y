package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.AppCategory
import com.pixy.ordertracker.models.SourceApp

/** Built-in services. Package names verified on Google Play. */
object Apps {
    const val SWIGGY_PKG = "in.swiggy.android"
    const val INSTAMART_PKG = "in.swiggy.android.instamart"
    const val ZOMATO_PKG = "com.application.zomato"
    const val BLINKIT_PKG = "com.grofers.customerapp"
    const val BIGBASKET_PKG = "com.bigbasket.mobileapp"

    val SWIGGY = SourceApp("swiggy", "Swiggy", SWIGGY_PKG, AppCategory.FOOD, "🍔", 0xFFFC8019)
    val INSTAMART = SourceApp("instamart", "Instamart", INSTAMART_PKG, AppCategory.GROCERY, "🛒", 0xFFE0218A)
    val ZOMATO = SourceApp("zomato", "Zomato", ZOMATO_PKG, AppCategory.FOOD, "🍕", 0xFFE23744)
    val BLINKIT = SourceApp("blinkit", "Blinkit", BLINKIT_PKG, AppCategory.GROCERY, "⚡", 0xFFF8CB46)
    val BIGBASKET = SourceApp("bigbasket", "BigBasket", BIGBASKET_PKG, AppCategory.GROCERY, "🧺", 0xFF84C225)

    val builtIn = listOf(SWIGGY, ZOMATO, BLINKIT, BIGBASKET, INSTAMART)

    const val CUSTOM_PREFIX = "pkg:"
    fun custom(packageName: String, label: String) =
        SourceApp(CUSTOM_PREFIX + packageName, label, packageName, AppCategory.OTHER, "📦", 0xFF7C8A99)
}
