package com.pixy.ordertracker.parsers

import org.junit.Assert.assertEquals
import org.junit.Test

class TextNormalizerTest {
    @Test fun stripsEmojiAndCollapsesSpaces() = assertEquals("Order delivered !", TextNormalizer.clean("Order   delivered 🎉🎉 !"))
    @Test fun keepsRupeeAndLines() = assertEquals("₹249\nPaid", TextNormalizer.clean("₹249\n\n  Paid "))
    @Test fun unifiesQuotesAndDashes() = assertEquals("We'll be there in 10-15 min", TextNormalizer.clean("We’ll be there in 10–15 min"))
    @Test fun skinToneAndZwj() = assertEquals("Rider on the way", TextNormalizer.clean("Rider 🏃🏽‍♂️ on the way"))
}
