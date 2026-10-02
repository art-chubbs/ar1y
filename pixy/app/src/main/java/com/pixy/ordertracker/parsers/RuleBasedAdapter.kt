package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.Eta
import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.OrderStatus
import com.pixy.ordertracker.models.ParseResult
import java.time.ZonedDateTime

/**
 * Shared parsing pipeline. Subclasses tune it with app-specific rules:
 * extra status phrases, promo/ignore wording, merchant patterns and a default merchant.
 */
abstract class RuleBasedAdapter : DeliveryAppAdapter {

    /** App-specific status phrases, checked together with [CommonRules]. */
    protected open val statusRules: List<StatusRule> = emptyList()
    /** Notifications from this app that are never about an order (wallet, account, ads...). */
    protected open val ignoreRules: List<Regex> = emptyList()
    protected open val promoRules: List<Regex> = emptyList()
    protected open val merchantPatterns: List<Regex> = emptyList()
    /** Grocery apps have no separate merchant; leave null so the UI shows the service name. */
    protected open val defaultMerchant: String? = null
    /** Words that are never a merchant or rider name for this app (its own brand names). */
    protected open val brandWords: Set<String> = emptySet()
    /** An "arriving in N" message only counts as ARRIVING when N is at most this. */
    protected open val arrivingMaxMinutes: Int = 10

    open fun cancellationRules(): List<StatusRule> = CommonRules.cancellation + CommonRules.failure
    open fun completionRules(): List<StatusRule> = CommonRules.completion
    open fun progressRules(): List<StatusRule> = CommonRules.progress

    override fun parse(snapshot: NotificationSnapshot, now: ZonedDateTime): ParseResult {
        val id = app.id
        if (snapshot.isGroupSummary) return ParseResult.ignored(id, "group summary (duplicate of a child notification)")
        if (snapshot.category == "promo") return ParseResult.ignored(id, "notification category is promo")

        val original = TextNormalizer.clean(snapshot.combinedText)
        if (original.isEmpty()) return ParseResult.ignored(id, "no readable text (custom notification layout?)")
        val text = original.lowercase()

        ignoreRules.firstOrNull { it.containsMatchIn(text) }?.let { return ParseResult.ignored(id, "ignored by rule: ${it.find(text)?.value}") }

        val hasContext = snapshot.isOngoing || CommonRules.orderContext.any { it.containsMatchIn(text) }
        val isPromo = (CommonRules.promo + promoRules).any { it.containsMatchIn(text) }
        if (isPromo && !hasContext) return ParseResult.ignored(id, "promotional wording, no order context")

        val all = statusRules + cancellationRules() + completionRules() + progressRules()
        val matched = all.filter { it.matches(text) }
        if (CommonRules.rating.containsMatchIn(text) && matched.none { it.status != OrderStatus.DELIVERED })
            return ParseResult.ignored(id, "rating prompt")

        var eta = EtaParser.parse(text, now)
        val status = resolveStatus(matched, eta)
        if (status.isTerminal) eta = Eta()   // "Delivered in 9 minutes" is not an ETA

        val related = (status != OrderStatus.UNKNOWN || (!eta.isEmpty && hasContext) || (hasContext && !isPromo))
        if (!related) return ParseResult.ignored(id, "no order wording")

        val why = buildString {
            append("status=").append(status)
            matched.firstOrNull { it.status == status }?.let { r -> append(" via \"").append(r.firstMatch(text)?.value).append('"') }
            if (eta.minutes != null) append(", eta=").append(eta.minutes).append(" min")
            if (hasContext) append(", order context") else append(", weak context")
        }
        return ParseResult(
            adapterId = id,
            isOrderRelated = true,
            status = status,
            eta = eta,
            merchantName = extractMerchant(original) ?: defaultMerchant,
            orderTitle = extractTitle(original),
            riderName = extractRider(original),
            hasOrderContext = hasContext,
            reason = why,
        )
    }

    /** Cancellation/failure beats delivery, delivery beats progress, otherwise the furthest stage wins. */
    protected open fun resolveStatus(matched: List<StatusRule>, eta: Eta): OrderStatus {
        val statuses = matched.map { it.status }.toSet()
        if (OrderStatus.CANCELLED in statuses) return OrderStatus.CANCELLED
        if (OrderStatus.FAILED in statuses) return OrderStatus.FAILED
        if (OrderStatus.DELIVERED in statuses) return OrderStatus.DELIVERED
        val progress = statuses.filter { !it.isTerminal }.sortedByDescending { it.rank }
        for (s in progress) {
            if (s == OrderStatus.ARRIVING && (eta.minutes ?: 0) > arrivingMaxMinutes) continue
            return s
        }
        return OrderStatus.UNKNOWN
    }

    protected open fun extractMerchant(original: String): String? {
        for (p in merchantPatterns + MERCHANT_PATTERNS) {
            for (m in p.findAll(original)) {
                val name = cleanName(m.groupValues[1]) ?: continue
                return name
            }
        }
        return null
    }

    protected open fun extractTitle(original: String): String? {
        ITEM_COUNT.find(original)?.let { return "${it.groupValues[1]} item" + if (it.groupValues[1] == "1") "" else "s" }
        DISH.find(original)?.let { m -> cleanName(m.groupValues[1])?.takeIf { it.lowercase() !in GENERIC_NOUNS }?.let { return it } }
        return null
    }

    protected open fun extractRider(original: String): String? {
        for (p in RIDER_PATTERNS) {
            for (m in p.findAll(original)) {
                val n = m.groupValues[1].trim()
                if (n.isEmpty() || !n[0].isUpperCase()) continue
                val first = n.split(' ').first()
                if (first.lowercase() in NOT_NAMES || first.lowercase() in brandWords) continue
                return n.split(' ').takeWhile { it.lowercase() !in NOT_NAMES }.joinToString(" ").ifEmpty { null } ?: continue
            }
        }
        return null
    }

    private fun cleanName(raw: String): String? {
        val n = raw.trim().trim('"', '\'', '-', ':', ' ').removeSuffix("'s").trim()
        if (n.length < 2 || n.length > 40) return null
        if (!(n[0].isUpperCase() || n[0].isDigit())) return null
        val lower = n.lowercase()
        if (lower in GENERIC_NOUNS || lower in brandWords || lower.split(' ').first() in NOT_NAMES) return null
        if (lower.startsWith("your ") || lower.startsWith("the ")) return null
        return n
    }

    companion object {
        private const val NAME = "([A-Z0-9][^\\n.,!?|:()]{1,40}?)"
        private val MERCHANT_PATTERNS = listOf(
            Regex("\\b(?:order|food|meal) from $NAME(?=\\s+(?:is|has|was|will|are|have|got)\\b|\\s*[.,!?|:\\n]|$)", RegexOption.IGNORE_CASE),
            Regex("\\bfrom $NAME (?:is|are|has been|has|was) (?:being |now )?(?:prepar|accept|confirm|cook|ready|pack|on)", RegexOption.IGNORE_CASE),
            Regex("^$NAME (?:has accepted|accepted|is preparing|has started preparing|is cooking|has confirmed|confirmed) (?:your|the) order", setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE)),
            Regex("\\border at $NAME(?=\\s+(?:is|has|was)\\b|\\s*[.,!?|\\n]|$)", RegexOption.IGNORE_CASE),
        )
        private val ITEM_COUNT = Regex("\\b(\\d{1,3}) items?\\b", RegexOption.IGNORE_CASE)
        private val DISH = Regex("\\byour ([A-Z][A-Za-z&' ]{2,30}?) (?:is|are) (?:being prepared|being packed|ready|on (?:the|its) way|out for delivery)")
        private val RIDER_PATTERNS = listOf(
            Regex("\\b(?:delivery partner|delivery executive|delivery agent|delivery boy|rider|valet)\\s*[,:\\-]?\\s*([A-Z][a-z]{1,15}(?: [A-Z][a-z]{1,15})?)\\b"),
            Regex("\\b([A-Z][a-z]{1,15}) (?:is|has) (?:on (?:the|his|her|their) way|picked up|arriving|reached|nearby|been assigned|assigned|out for delivery)"),
        )
        private val GENERIC_NOUNS = setOf(
            "order", "food", "items", "item", "delivery", "meal", "groceries", "parcel", "package", "restaurant", "store",
            "the restaurant", "the store", "us", "you", "it", "here", "there", "today", "your order",
        )
        private val NOT_NAMES = setOf(
            "your", "order", "food", "the", "it", "he", "she", "they", "we", "rider", "valet", "delivery", "restaurant", "is", "has",
            "will", "on", "partner", "executive", "agent", "boy", "swiggy", "zomato", "blinkit", "instamart", "bigbasket", "bb",
            "items", "groceries", "parcel", "great", "good", "yay", "hey", "hi", "hello", "almost", "hurray", "woohoo", "track",
        )
    }
}
