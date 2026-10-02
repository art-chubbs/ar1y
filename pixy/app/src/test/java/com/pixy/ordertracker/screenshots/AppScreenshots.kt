package com.pixy.ordertracker.screenshots

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onRoot
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pixy.ordertracker.PixyApp
import com.pixy.ordertracker.domain.Simulator
import com.pixy.ordertracker.parsers.Apps
import com.pixy.ordertracker.ui.MainActivity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowLooper
import java.io.File

/** Launches the real MainActivity (proves it starts) and saves the screens in light and dark mode. */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [36], application = PixyApp::class)
class AppScreenshots {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()
    private val app get() = ApplicationProvider.getApplicationContext<PixyApp>()

    private fun save(name: String) {
        rule.waitForIdle()
        val bmp = rule.onRoot().captureToImage().asAndroidBitmap()
        File("build/screenshots").apply { mkdirs() }.resolve("$name.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun homeWithOrders(suffix: String) {
        runBlocking { app.settings.setOnboardingDone(true) }
        app.simulator.post(Apps.SWIGGY, Simulator.Step.CONFIRMED)
        app.simulator.post(Apps.BLINKIT, Simulator.Step.CONFIRMED)
        runBlocking { while (app.orders.activeOrders.first().size < 2) { ShadowLooper.idleMainLooper(); Thread.sleep(20) } }
        app.simulator.post(Apps.SWIGGY, Simulator.Step.PICKED_UP)
        Thread.sleep(300)
        rule.mainClock.advanceTimeBy(1500)
        save("app_2_home_$suffix")
    }

    private fun setup(name: String) { runBlocking { app.settings.setOnboardingDone(false) }; Thread.sleep(200); rule.mainClock.advanceTimeBy(500); save(name) }

    @Test @Config(qualifiers = "w411dp-h891dp-xxhdpi") fun setupLight() = setup("app_1_setup_light")
    @Test @Config(qualifiers = "w411dp-h891dp-night-xxhdpi") fun setupDark() = setup("app_1_setup_dark")
    @Test @Config(qualifiers = "w411dp-h891dp-xxhdpi") fun homeLight() = homeWithOrders("light")
    @Test @Config(qualifiers = "w411dp-h891dp-night-xxhdpi") fun homeDark() = homeWithOrders("dark")
}
