package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.NotificationSnapshot
import com.pixy.ordertracker.models.ParseResult
import java.time.ZoneId
import java.time.ZonedDateTime

val ZONE: ZoneId = ZoneId.of("Asia/Kolkata")
/** 2026-10-02 20:00 IST unless a test says otherwise. */
val NOW: ZonedDateTime = ZonedDateTime.of(2026, 10, 2, 20, 0, 0, 0, ZONE)

private val parser = NotificationParser(AdapterRegistry())

fun snap(pkg: String, title: String?, text: String? = null, bigText: String? = null, ongoing: Boolean = false, key: String = "k") =
    NotificationSnapshot(packageName = pkg, key = key, postTime = NOW.toInstant().toEpochMilli(), title = title, text = text, bigText = bigText, isOngoing = ongoing)

fun parse(pkg: String, title: String?, text: String? = null, ongoing: Boolean = false, now: ZonedDateTime = NOW, bigText: String? = null): ParseResult =
    parser.parse(snap(pkg, title, text, bigText, ongoing), now).result
