package com.pixy.ordertracker.parsers

import com.pixy.ordertracker.models.OrderStatus.*
import com.pixy.ordertracker.parsers.Apps.BIGBASKET_PKG
import com.pixy.ordertracker.parsers.Apps.BLINKIT_PKG
import com.pixy.ordertracker.parsers.Apps.INSTAMART_PKG
import com.pixy.ordertracker.parsers.Apps.SWIGGY_PKG
import com.pixy.ordertracker.parsers.Apps.ZOMATO_PKG
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationParserTest {

    // ---------- Swiggy ----------
    @Test fun swiggyConfirmedWithMerchantAndEta() {
        val r = parse(SWIGGY_PKG, "Order Confirmed!", "Your order from Paradise Biryani has been confirmed and will be delivered in 35 mins")
        assertEquals("swiggy", r.adapterId)
        assertEquals(CONFIRMED, r.status)
        assertEquals("Paradise Biryani", r.merchantName)
        assertEquals(35, r.eta.minutes)
        assertTrue(r.hasOrderContext)
    }

    @Test fun swiggyRestaurantAccepted() =
        assertEquals(CONFIRMED, parse(SWIGGY_PKG, "Restaurant has accepted your order").status)

    @Test fun swiggyPreparingMerchantAtStart() {
        val r = parse(SWIGGY_PKG, "Paradise Biryani is preparing your order", "We'll let you know once it's picked up")
        assertEquals(PREPARING, r.status)
        assertEquals("Paradise Biryani", r.merchantName)
    }

    @Test fun swiggyFoodBeingPrepared() = assertEquals(PREPARING, parse(SWIGGY_PKG, "Your food is being prepared 🍳").status)

    @Test fun swiggyPickedUpWithRider() {
        val r = parse(SWIGGY_PKG, "Ramesh has picked up your order 🛵", "He's heading your way")
        assertEquals(PICKED_UP, r.status)
        assertEquals("Ramesh", r.riderName)
    }

    @Test fun deliveryPartnerPickedUp() =
        assertEquals(PICKED_UP, parse(SWIGGY_PKG, "Your delivery partner has picked up your order").status)

    @Test fun swiggyOnTheWayLongEtaIsOutForDelivery() {
        val r = parse(SWIGGY_PKG, "Your order is on the way!", "Arriving in 12 mins")
        assertEquals(OUT_FOR_DELIVERY, r.status)
        assertEquals(12, r.eta.minutes)
    }

    @Test fun shortEtaIsArriving() {
        val r = parse(SWIGGY_PKG, "Almost there!", "Arriving in 5 minutes", ongoing = true)
        assertEquals(ARRIVING, r.status)
        assertEquals(5, r.eta.minutes)
    }

    @Test fun arrivingInEightMinutes() = assertEquals(8, parse(SWIGGY_PKG, "Your order is arriving", "Arriving in 8 minutes").eta.minutes)

    @Test fun riderAtRestaurantIsNotArriving() {
        val r = parse(SWIGGY_PKG, "Your delivery partner Suresh has reached the restaurant")
        assertEquals(PREPARING, r.status)
        assertEquals("Suresh", r.riderName)
    }

    @Test fun deliveredWithEmojiAndCaps() = assertEquals(DELIVERED, parse(SWIGGY_PKG, "ORDER DELIVERED 🎉", "Enjoy your meal!").status)

    @Test fun cancelledWithRefund() =
        assertEquals(CANCELLED, parse(SWIGGY_PKG, "Order Cancelled", "Your order has been cancelled. Refund initiated to your account.").status)

    @Test fun paymentFailed() = assertEquals(FAILED, parse(SWIGGY_PKG, "Payment failed", "Your payment failed. Please retry to place your order").status)

    @Test fun promoIsIgnored() {
        val r = parse(SWIGGY_PKG, "Hungry? 😋", "Get 50% OFF on Biryani. Order now!")
        assertFalse(r.isOrderRelated)
    }

    @Test fun promoWithoutStatusButYourOrderIsIgnored() =
        assertFalse(parse(SWIGGY_PKG, "Swiggy One", "Free delivery on your order this weekend").isOrderRelated)

    @Test fun ratingPromptIsIgnored() = assertFalse(parse(ZOMATO_PKG, "How was your food from Behrouz Biryani?", "Rate your order").isOrderRelated)

    @Test fun unrelatedTextIsIgnored() = assertFalse(parse(SWIGGY_PKG, "Something new for you", "Explore the menu").isOrderRelated)

    @Test fun instamartInsideSwiggyApp() {
        val r = parse(SWIGGY_PKG, "Your Instamart order is packed", "It will be on its way soon")
        assertEquals("instamart", r.adapterId)
        assertEquals(READY, r.status)
    }

    @Test fun standaloneInstamartApp() {
        val r = parse(INSTAMART_PKG, "Arriving in 9 mins", "Your order of 12 items is on the way", ongoing = true)
        assertEquals("instamart", r.adapterId)
        assertEquals(ARRIVING, r.status)
        assertEquals("12 items", r.orderTitle)
    }

    // ---------- Zomato ----------
    @Test fun zomatoAccepted() {
        val r = parse(ZOMATO_PKG, "Order accepted", "Your order from Behrouz Biryani has been accepted")
        assertEquals(CONFIRMED, r.status)
        assertEquals("Behrouz Biryani", r.merchantName)
    }

    @Test fun zomatoValetOnTheWay() {
        val r = parse(ZOMATO_PKG, "Valet Arjun is on the way with your order")
        assertEquals(OUT_FOR_DELIVERY, r.status)
        assertEquals("Arjun", r.riderName)
    }

    @Test fun zomatoAbsoluteEta() {
        val r = parse(ZOMATO_PKG, "Your order is on its way", "Arriving at 8:25 PM")
        assertEquals(OUT_FOR_DELIVERY, r.status)
        assertEquals(25, r.eta.minutes)
    }

    @Test fun zomatoWillArriveLongEtaKeepsUnknownStatus() {
        val r = parse(ZOMATO_PKG, "Your order will arrive in 30 mins")
        assertEquals(UNKNOWN, r.status)
        assertEquals(30, r.eta.minutes)
        assertTrue(r.isOrderRelated)
    }

    @Test fun deliveredFutureTenseIsNotDelivered() =
        assertEquals(CONFIRMED, parse(ZOMATO_PKG, "Order confirmed", "It will be delivered by 9:10 PM").status)

    // ---------- Blinkit ----------
    @Test fun blinkitPackedNotOnTheWay() = assertEquals(READY, parse(BLINKIT_PKG, "Order packed 📦", "Your order is packed and will be on its way soon").status)

    @Test fun blinkitArrivingQuickCommerce() {
        val r = parse(BLINKIT_PKG, "Arriving in 8 minutes", "Your order is on the way", ongoing = true)
        assertEquals(ARRIVING, r.status)
        assertEquals(8, r.eta.minutes)
    }

    @Test fun blinkitDeliveredInMinutesIsPastTense() {
        val r = parse(BLINKIT_PKG, "Delivered in 9 minutes!", "Hope you enjoy your order")
        assertEquals(DELIVERED, r.status)
        assertNull(r.eta.minutes)
    }

    // ---------- BigBasket ----------
    @Test fun bigbasketSlot() {
        val r = parse(BIGBASKET_PKG, "Order placed", "Your order will be delivered between 9:00 PM - 11:00 PM")
        assertEquals(CONFIRMED, r.status)
        assertEquals(180, r.eta.minutes)
        assertTrue(r.eta.windowStart != null)
    }

    @Test fun bigbasketDispatched() = assertEquals(OUT_FOR_DELIVERY, parse(BIGBASKET_PKG, "Your order has been dispatched").status)

    @Test fun bigbasketDelivered() = assertEquals(DELIVERED, parse(BIGBASKET_PKG, "Order delivered", "Your bigbasket order has been delivered").status)

    // ---------- robustness ----------
    @Test fun multilineAndPunctuation() {
        val r = parse(SWIGGY_PKG, null, null, bigText = "Paradise Biryani\n\nYour order is OUT FOR DELIVERY!!!\nETA: 14 min")
        assertEquals(OUT_FOR_DELIVERY, r.status)
        assertEquals(14, r.eta.minutes)
    }

    @Test fun unsupportedPackageIsIgnored() = assertFalse(parse("com.whatsapp", "Your order is on the way").isOrderRelated)

    @Test fun emptyNotificationDoesNotCrash() = assertFalse(parse(SWIGGY_PKG, "", "").isOrderRelated)

    @Test fun hostileInputDoesNotCrash() {
        val junk = "\u0000\uD83D".repeat(500) + "%%%".repeat(1000)
        assertFalse(parse(SWIGGY_PKG, junk, junk).isOrderRelated && false)
    }

    // ---------- stage + ETA without "your order" ----------
    @Test fun stageAndEtaWithoutOrderWordingStillTracks() {
        val r = parse(ZOMATO_PKG, "Paradise Biryani", "Food is being prepared · arriving in 27 mins")
        assertTrue(r.isOrderRelated)
        assertTrue(r.hasOrderContext)
        assertEquals(PREPARING, r.status)
        assertEquals(27, r.eta.minutes)
    }

    @Test fun promoWithStageAndEtaIsStillIgnored() {
        val r = parse(SWIGGY_PKG, "Hungry?", "Biryani prepared fresh, delivered in 30 mins. Get 50% off, order now!")
        assertFalse(r.isOrderRelated)
    }
}
