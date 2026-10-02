package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.models.SourceApp

class SwiggyAdapter : RuleBasedAdapter() {
    override val app = Apps.SWIGGY
    override val packageNames = setOf(Apps.SWIGGY_PKG)
    override val brandWords = setOf("swiggy", "swiggy one", "instamart", "dineout", "genie")
    override val ignoreRules = listOf(rx("\\bswiggy one\\b(?!.*\\byour order\\b)"), rx("\\bdineout\\b"), rx("\\bgenie\\b"), rx("\\bswiggy money\\b"), rx("\\bminis\\b"))
    override val statusRules = listOf(
        StatusRule(OrderStatus.PREPARING, rx("\\b(?:is|has reached|reached) (?:at )?the restaurant\\b|\\bwaiting for (?:your )?food\\b")),
        StatusRule(OrderStatus.CONFIRMED, rx("\\brestaurant has (?:accepted|confirmed)\\b")),
    )
}

/** Swiggy Instamart: the standalone app, or Instamart orders inside the Swiggy app. */
class InstamartAdapter : RuleBasedAdapter() {
    override val app = Apps.INSTAMART
    override val packageNames = setOf(Apps.INSTAMART_PKG, Apps.SWIGGY_PKG)
    override val priority = 10
    override val brandWords = setOf("instamart", "swiggy")
    override fun canHandle(snapshot: NotificationSnapshot): Boolean =
        snapshot.packageName == Apps.INSTAMART_PKG ||
            (snapshot.packageName == Apps.SWIGGY_PKG && snapshot.combinedText.contains("instamart", ignoreCase = true))
    override val statusRules = listOf(StatusRule(OrderStatus.READY, rx("\\b(?:items|order) (?:are |is |have been |has been )?packed\\b")))
}

class ZomatoAdapter : RuleBasedAdapter() {
    override val app = Apps.ZOMATO
    override val packageNames = setOf(Apps.ZOMATO_PKG)
    override val brandWords = setOf("zomato", "zomato gold", "gold", "district")
    override val ignoreRules = listOf(rx("\\bzomato money\\b"), rx("\\bfeeding india\\b"), rx("\\bdining out\\b|\\btable booking\\b|\\bdistrict\\b"))
    override val statusRules = listOf(
        StatusRule(OrderStatus.PREPARING, rx("\\b(?:is|has reached|reached) (?:at )?the restaurant\\b|\\bwaiting (?:at the restaurant|for (?:your )?food)\\b")),
        StatusRule(OrderStatus.CONFIRMED, rx("\\bhas accepted your order\\b")),
    )
}

class BlinkitAdapter : RuleBasedAdapter() {
    override val app = Apps.BLINKIT
    override val packageNames = setOf(Apps.BLINKIT_PKG)
    override val brandWords = setOf("blinkit", "grofers")
    override val ignoreRules = listOf(rx("\\bprint(?:out)?s?\\b(?!.*\\byour order\\b)"))
    override val statusRules = listOf(StatusRule(OrderStatus.READY, rx("\\border (?:is |has been )?packed\\b")))
}

class BigBasketAdapter : RuleBasedAdapter() {
    override val app = Apps.BIGBASKET
    override val packageNames = setOf(Apps.BIGBASKET_PKG)
    override val brandWords = setOf("bigbasket", "bb now", "bb", "bbnow", "bb daily")
    override val statusRules = listOf(
        StatusRule(OrderStatus.CONFIRMED, rx("\\bslot (?:is )?(?:confirmed|booked)\\b")),
        StatusRule(OrderStatus.OUT_FOR_DELIVERY, rx("\\b(?:has )?left (?:our|the) (?:store|warehouse|hub)\\b")),
    )
}

/** Any other app the user adds by package name. Uses only the shared wording. */
class GenericDeliveryAdapter(packageName: String, label: String) : RuleBasedAdapter() {
    override val app: SourceApp = Apps.custom(packageName, label)
    override val packageNames = setOf(packageName)
    override val priority = -10
    override val brandWords = setOf(label.lowercase())
}
