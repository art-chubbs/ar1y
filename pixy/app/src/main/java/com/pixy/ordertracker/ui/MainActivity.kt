package com.pixy.ordertracker.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.pixy.ordertracker.ui.screens.AddAppScreen
import com.pixy.ordertracker.ui.screens.DebugScreen
import com.pixy.ordertracker.ui.screens.DetailScreen
import com.pixy.ordertracker.ui.screens.HomeScreen
import com.pixy.ordertracker.ui.screens.SettingsScreen
import com.pixy.ordertracker.ui.screens.SetupScreen
import com.pixy.ordertracker.ui.screens.TestModeScreen

sealed interface Route {
    val depth: Int
    data object Home : Route { override val depth = 0 }
    data object Settings : Route { override val depth = 1 }
    data object TestMode : Route { override val depth = 1 }
    data object Debug : Route { override val depth = 2 }
    data object AddApp : Route { override val depth = 2 }
    data class Detail(val id: Long) : Route { override val depth = 1 }
}

class MainActivity : ComponentActivity() {
    private val vm: MainViewModel by viewModels()
    private var route by mutableStateOf<Route>(Route.Home)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        handle(intent)
        setContent { PixyTheme { App() } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handle(intent)
    }

    override fun onResume() {
        super.onResume()
        vm.refreshPermissions()   // the user may be back from a Settings screen
    }

    private fun handle(intent: Intent?) {
        val id = intent?.getLongExtra(EXTRA_ORDER_ID, -1L) ?: -1L
        if (id > 0) route = Route.Detail(id)
    }

    @Composable
    private fun App() {
        val settings = vm.settings.collectAsState().value ?: return   // first DataStore read is near-instant
        if (!settings.onboardingDone) {
            SetupScreen(vm, onDone = { vm.setOnboardingDone() })
            return
        }
        val go: (Route) -> Unit = { route = it }
        val back: () -> Unit = {
            route = when (route) { Route.Debug, Route.AddApp -> Route.Settings; else -> Route.Home }
        }
        BackHandler(enabled = route != Route.Home, onBack = back)
        AnimatedContent(
            targetState = route,
            transitionSpec = {
                val forward = targetState.depth >= initialState.depth
                (slideInHorizontally(tween(260)) { if (forward) it / 4 else -it / 4 } + fadeIn(tween(220))) togetherWith
                    (slideOutHorizontally(tween(260)) { if (forward) -it / 6 else it / 6 } + fadeOut(tween(160)))
            },
            label = "route",
        ) { r ->
            when (r) {
                Route.Home -> HomeScreen(vm, go)
                Route.Settings -> SettingsScreen(vm, go, back)
                Route.TestMode -> TestModeScreen(vm, back)
                Route.Debug -> DebugScreen(vm, back)
                Route.AddApp -> AddAppScreen(vm, back)
                is Route.Detail -> DetailScreen(vm, r.id, back)
            }
        }
    }

    companion object { const val EXTRA_ORDER_ID = "order_id" }
}
