package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.OrderStatus

/**
 * A phrase that maps notification wording to a standard [OrderStatus].
 * [unless] patterns veto the rule (e.g. "reached the restaurant" is not "arriving").
 */
data class StatusRule(
    val status: OrderStatus,
    val pattern: Regex,
    val unless: List<Regex> = emptyList(),
    val name: String = pattern.pattern,
) {
    fun matches(text: String): Boolean = firstMatch(text) != null

    /** First match that is a statement of fact, not a condition ("we'll tell you once it's picked up"). */
    fun firstMatch(text: String): MatchResult? {
        if (unless.any { it.containsMatchIn(text) }) return null
        return pattern.findAll(text).firstOrNull { m ->
            val clauseStart = maxOf(text.lastIndexOfAny(charArrayOf('.', '!', '?', '\n', ';'), m.range.first - 1) + 1, 0)
            !CONDITIONAL.containsMatchIn(text.substring(clauseStart, m.range.first))
        }
    }

    private companion object {
        val CONDITIONAL = Regex("\\b(?:once|when|whenever|as soon as|after|until|till|before|if|let you know|notify you|update you)\\b", RegexOption.IGNORE_CASE)
    }
}

internal fun rx(p: String) = Regex(p, RegexOption.IGNORE_CASE)

/** Wording shared by most Indian delivery apps. Adapters add their own rules in front of these. */
object CommonRules {
    private val atPickupPlace = rx("\\b(?:reached|arrived|at|near|to) (?:at )?(?:the )?(?:restaurant|store|outlet|shop|kitchen|warehouse|pick ?up(?: point| location)?)\\b")
    // "will be delivered by 9 PM", "get it delivered" are promises, not completion. "Delivered in 9 minutes" is past tense.
    private val futureDelivered = rx("\\b(?:will|would|to|shall|should|could|can|may|might) (?:be |get )?delivered\\b|\\b(?:get|gets|getting) (?:it |them |your \\w+ )?delivered\\b|\\bdelivered (?:by|before|between|soon|shortly|tomorrow|today by)\\b")

    val cancellation = listOf(
        StatusRule(OrderStatus.CANCELLED, rx("\\bcancel(?:l)?ed\\b"), unless = listOf(rx("\\b(?:not|never) (?:been )?cancel"))),
        StatusRule(OrderStatus.CANCELLED, rx("\\brefund (?:has been |is |was )?(?:initiated|processed|credited)\\b")),
    )
    val failure = listOf(
        StatusRule(OrderStatus.FAILED, rx("\\bpayment (?:has |was )?failed\\b")),
        StatusRule(OrderStatus.FAILED, rx("\\border (?:has |was )?failed\\b")),
        StatusRule(OrderStatus.FAILED, rx("\\bcould(?:n'?t| not) be (?:placed|delivered)\\b")),
        StatusRule(OrderStatus.FAILED, rx("\\b(?:unable to|could(?:n'?t| not)) deliver\\b")),
        StatusRule(OrderStatus.FAILED, rx("\\bdelivery (?:attempt )?(?:has )?failed\\b|\\bundelivered\\b")),
    )
    val completion = listOf(
        StatusRule(OrderStatus.DELIVERED, rx("\\bdelivered\\b"), unless = listOf(futureDelivered, rx("\\bundelivered\\b"))),
        StatusRule(OrderStatus.DELIVERED, rx("\\border (?:is |has been )?complete(?:d)?\\b")),
        StatusRule(OrderStatus.DELIVERED, rx("\\benjoy your (?:meal|food|order|groceries)\\b")),
        StatusRule(OrderStatus.DELIVERED, rx("\\bhope you (?:enjoy|enjoyed|liked|loved)\\b")),
    )
    val progress = listOf(
        StatusRule(OrderStatus.ARRIVING, rx("\\barriv(?:ing|es)\\b|\\bwill arrive\\b|\\b(?:has |have )arrived\\b"), unless = listOf(atPickupPlace)),
        StatusRule(OrderStatus.ARRIVING, rx("\\balmost (?:there|here)\\b|\\b(?:is |are )?nearby\\b|\\bclose by\\b")),
        StatusRule(OrderStatus.ARRIVING, rx("\\b(?:has |have )?reached (?:your|you)\\b|\\bat your (?:door|doorstep|location|gate|address)\\b|\\bis (?:right )?outside\\b"), unless = listOf(atPickupPlace)),
        StatusRule(OrderStatus.ARRIVING, rx("\\b(?:few|couple of|\\d{1,2}) (?:mins?|minutes?) away\\b|\\babout to (?:reach|arrive)\\b|\\b(?:will )?reach(?:ing)? (?:you|your (?:location|address|door))\\b")),
        StatusRule(OrderStatus.OUT_FOR_DELIVERY, rx("\\bout for delivery\\b|\\bon (?:the|its|his|her|their) way\\b|\\ben ?route\\b|\\bon route\\b|\\bdispatched\\b|\\bshipped\\b|\\bheading (?:to|towards) (?:you|your)\\b"),
            unless = listOf(
                rx("\\bon (?:the|his|her|their|its) way to (?:the )?(?:restaurant|store|outlet|shop|pick ?up)\\b"),
                rx("\\b(?:will|would|shall|should|soon) (?:soon )?be on (?:the|its|his|her|their) way\\b"),
            )),
        StatusRule(OrderStatus.PICKED_UP, rx("\\bpicked (?:it |your order |the order )?up\\b|\\bpick ?up (?:is )?(?:done|complete(?:d)?)\\b|\\bcollected (?:your |the )?(?:order|food|items|parcel)\\b")),
        StatusRule(OrderStatus.READY, rx("\\b(?:is|are|now) ready\\b|\\bready for (?:pick ?up|dispatch|delivery)\\b|\\b(?:has been |is |been |got )?packed\\b"), unless = listOf(rx("\\bbeing packed\\b|\\bready to order\\b"))),
        StatusRule(OrderStatus.PREPARING, rx("\\bprepar(?:ing|ed)\\b|\\bbeing (?:cooked|made|packed)\\b|\\bcooking\\b|\\bin the kitchen\\b|\\bpacking\\b|\\bstarted (?:preparing|working on|packing|cooking)\\b")),
        StatusRule(OrderStatus.CONFIRMED, rx("\\bconfirmed\\b|\\baccepted\\b|\\border (?:has been |is |was )?(?:placed|received)\\b|\\bplaced successfully\\b|\\breceived your order\\b|\\bthanks? (?:you )?for (?:your order|ordering)\\b")),
        StatusRule(OrderStatus.CONFIRMED, rx("\\blooking for (?:a )?(?:delivery partner|rider|valet)\\b|\\b(?:delivery partner|rider|valet|delivery executive) (?:has been |is |was )?assigned\\b")),
    )

    /** Marketing wording. Only disqualifies a notification that has no order context. */
    val promo = listOf(
        rx("\\b\\d{1,3}\\s?% (?:off|cashback)\\b"), rx("\\bflat (?:rs\\.?|₹|inr)?\\s?\\d"), rx("\\bcoupon\\b|\\bpromo(?: ?code)?\\b|\\bcashback\\b"),
        rx("\\bdeals?\\b|\\boffers?\\b|\\bsale\\b|\\bdiscount\\b"), rx("\\bfree delivery\\b|\\border now\\b|\\bhungry\\??\\b|\\bcraving\\b"),
        rx("\\btreat yourself\\b|\\bdon'?t miss\\b|\\blimited[- ]time\\b|\\bmembership\\b|\\bsubscribe\\b|\\bbuy (?:1|one) get\\b"),
        rx("\\bnew on\\b|\\btry (?:our|the|new)\\b|\\bcheck out\\b|\\bwe miss you\\b|\\bcome back\\b"),
    )

    /** Signals that this is about a specific order, not marketing. */
    val orderContext = listOf(
        rx("\\byour (?:order|food|items|delivery|groceries|meal|parcel|package)\\b"),
        rx("\\border\\s?(?:#|no\\.?|id|number)\\s?:?\\s?\\w*\\d"),
        rx("\\b(?:delivery partner|delivery executive|delivery agent|rider|valet)\\b"),
        Regex("^(?:your )?order (?:confirmed|placed|accepted|picked up|packed|ready|delivered|cancel(?:l)?ed|is|has|was|will|from|at)\\b", setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE)),
        rx("\\border (?:from|at) [a-z0-9]"),
    )

    val rating = rx("\\b(?:rate|review) (?:your|the|this) (?:order|food|meal|experience|delivery)\\b|\\bhow was your (?:order|food|meal|experience)\\b")
}
