package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.Eta
import java.time.Duration
import java.time.LocalTime
import java.time.ZonedDateTime
import kotlin.math.ceil

/**
 * Extracts an ETA exactly as the delivery app stated it. Returns an empty [Eta] when there is none:
 * the app never invents an arrival time.
 *
 * Handles "Arriving in 18 mins", "10-15 min", "in 1 hr 5 min", "half an hour",
 * "Arriving at 11:25 PM", "by 9:30", "between 7:00 PM - 9:00 PM", "ETA: 12 min".
 */
object EtaParser {
    private const val MAX_MINUTES = 6 * 60

    private val MIN = "(?:mins?|minutes?|m)\\b"
    private val hourMin = Regex("(\\d{1,2})\\s*(?:hrs?|hours?)\\s*(?:and\\s*)?(\\d{1,2})\\s*(?:mins?|minutes?)\\b")
    private val hoursOnly = Regex("\\b(?:in|within|under|about|around|approx(?:imately)?)\\s+(\\d{1,2})\\s*(?:hrs?|hours?)\\b")
    private val halfHour = Regex("\\b(?:in|within|about|around)\\s+(?:half an hour|30 minutes?)\\b")
    private val anHour = Regex("\\b(?:in|within|about|around)\\s+(?:an|one) hour\\b")
    private val range = Regex("(\\d{1,3})\\s*(?:-|to)\\s*(\\d{1,3})\\s*$MIN")
    private val contextual = Regex("(?:\\bin|\\bwithin|\\bunder|\\babout|\\baround|\\bapprox(?:imately)?|\\beta|\\bnext|~|:)\\s*(\\d{1,3})\\s*$MIN")
    private val trailing = Regex("\\b(\\d{1,3})\\s*(?:mins?|minutes?)\\s*(?:away|left|to go|more)\\b")
    private val etaColon = Regex("\\beta\\s*[:\\-]?\\s*(\\d{1,3})\\b")

    private const val CLOCK = "(\\d{1,2})(?:[:.](\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?"
    private val slot = Regex("\\b(?:between|from)\\s+$CLOCK\\s*(?:-|to|and)\\s*$CLOCK")
    private val clock = Regex("\\b(?:at|by|around|before|till|until|approx(?:imately)?|eta)\\s*:?\\s*$CLOCK")

    fun parse(matchText: String, now: ZonedDateTime): Eta {
        val t = matchText.lowercase()
        relativeMinutes(t)?.let { m ->
            if (m in 1..MAX_MINUTES) {
                val at = now.plusMinutes(m.toLong()).toInstant().toEpochMilli()
                return Eta(minutes = m, at = at)
            }
        }
        slot.find(t)?.let { mr ->
            val g = mr.groupValues
            val endAmPm = g[6].ifEmpty { null }
            val start = resolveClock(g[1], g[2], g[3].ifEmpty { endAmPm }, now)
            val end = resolveClock(g[4], g[5], endAmPm, now)
            if (start != null && end != null) {
                val endFixed = if (end.isBefore(start)) end.plusDays(1) else end
                return Eta(minutes = minutesUntil(endFixed, now), at = endFixed.toInstant().toEpochMilli(), windowStart = start.toInstant().toEpochMilli())
            }
        }
        for (mr in clock.findAll(t)) {
            val g = mr.groupValues
            // Require minutes or am/pm so "at 2" or "by 50% off" never parse as a time.
            if (g[2].isEmpty() && g[3].isEmpty()) continue
            val at = resolveClock(g[1], g[2], g[3].ifEmpty { null }, now) ?: continue
            val minutes = minutesUntil(at, now)
            if (minutes > 24 * 60) continue
            return Eta(minutes = minutes, at = at.toInstant().toEpochMilli())
        }
        return Eta()
    }

    private fun relativeMinutes(t: String): Int? {
        hourMin.find(t)?.let { return it.groupValues[1].toInt() * 60 + it.groupValues[2].toInt() }
        range.find(t)?.let { return maxOf(it.groupValues[1].toInt(), it.groupValues[2].toInt()) } // quote the later bound
        contextual.find(t)?.let { return it.groupValues[1].toInt() }
        trailing.find(t)?.let { return it.groupValues[1].toInt() }
        hoursOnly.find(t)?.let { return it.groupValues[1].toInt() * 60 }
        if (halfHour.containsMatchIn(t)) return 30
        if (anHour.containsMatchIn(t)) return 60
        etaColon.find(t)?.let { return it.groupValues[1].toInt() }
        return null
    }

    private fun minutesUntil(at: ZonedDateTime, now: ZonedDateTime): Int =
        maxOf(0, ceil(Duration.between(now, at).seconds / 60.0).toInt())

    /** Next sensible occurrence of h:mm (am/pm optional) relative to [now]. */
    internal fun resolveClock(h: String, m: String, ampm: String?, now: ZonedDateTime): ZonedDateTime? {
        var hour = h.toIntOrNull() ?: return null
        val minute = m.ifEmpty { "0" }.toIntOrNull() ?: return null
        if (minute > 59 || hour > 23) return null
        val marker = ampm?.replace(".", "")
        if (marker != null) {
            if (hour !in 1..12) return null
            hour = when (marker) { "am" -> if (hour == 12) 0 else hour; else -> if (hour == 12) 12 else hour + 12 }
        }
        val grace = now.minusMinutes(15)
        fun at(hh: Int): ZonedDateTime {
            var c = now.with(LocalTime.of(hh, minute)).withSecond(0).withNano(0)
            if (c.isBefore(grace)) c = c.plusDays(1)
            return c
        }
        if (marker == null && hour in 1..12) {
            // "by 9:30" with no am/pm: whichever of 9:30 / 21:30 comes next.
            val a = at(if (hour == 12) 0 else hour)
            val b = at(if (hour == 12) 12 else hour + 12)
            return if (a.isBefore(b)) a else b
        }
        return at(hour)
    }
}
