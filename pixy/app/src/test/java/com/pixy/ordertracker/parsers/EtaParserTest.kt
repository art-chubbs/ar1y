package com.pixy.ordertracker.parsers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.ZonedDateTime

class EtaParserTest {
    private fun eta(s: String, now: ZonedDateTime = NOW) = EtaParser.parse(s, now)
    private fun clock(ms: Long?) = Instant.ofEpochMilli(ms!!).atZone(ZONE).toLocalTime().toString()

    @Test fun minutes() = assertEquals(18, eta("Arriving in 18 mins").minutes)
    @Test fun minutesAbbreviated() = assertEquals(7, eta("arriving in 7 min").minutes)
    @Test fun range() = assertEquals(15, eta("Arriving in 10-15 minutes").minutes)
    @Test fun rangeWithTo() = assertEquals(25, eta("in 20 to 25 mins").minutes)
    @Test fun hoursAndMinutes() = assertEquals(65, eta("in 1 hr 5 min").minutes)
    @Test fun halfHour() = assertEquals(30, eta("Arriving in half an hour").minutes)
    @Test fun away() = assertEquals(4, eta("Rider is 4 mins away").minutes)
    @Test fun etaColon() = assertEquals(14, eta("ETA: 14 min").minutes)
    @Test fun absolutePm() {
        val e = eta("Arriving at 11:25 PM")
        assertEquals(205, e.minutes)
        assertEquals("23:25", clock(e.at))
    }
    @Test fun absoluteWithoutAmPmPicksNextOccurrence() = assertEquals("21:30", clock(eta("delivered by 9:30").at))
    @Test fun absoluteAfterMidnight() {
        val late = ZonedDateTime.of(2026, 10, 2, 23, 50, 0, 0, ZONE)
        val e = eta("arriving by 12:10 AM", late)
        assertEquals(20, e.minutes)
    }
    @Test fun slot() {
        val e = eta("between 7 pm and 9 pm", NOW.withHour(15))
        assertEquals("21:00", clock(e.at))
        assertNotNull(e.windowStart)
    }
    @Test fun noEtaIsNotInvented() = assertTrue(eta("Your order is being prepared").isEmpty)
    @Test fun percentIsNotTime() = assertTrue(eta("Get 50% off at 2 outlets").isEmpty)
    @Test fun bareNumberIsNotTime() = assertNull(eta("Order 2 placed").minutes)
}
