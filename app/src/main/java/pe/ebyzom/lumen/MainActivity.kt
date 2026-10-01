package pe.ebyzom.lumen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import pe.ebyzom.lumen.data.local.AppDatabase
import pe.ebyzom.lumen.data.repository.ScriptRepository
import pe.ebyzom.lumen.navigation.NavGraph
import pe.ebyzom.lumen.navigation.Screen
import pe.ebyzom.lumen.ui.components.AdBanner
import pe.ebyzom.lumen.ui.components.DonationDialog
import pe.ebyzom.lumen.ui.components.LumenBottomNav
import pe.ebyzom.lumen.ui.components.LumenHeader
import pe.ebyzom.lumen.ui.components.LumenMenuSheet
import pe.ebyzom.lumen.ui.components.UserManualDialog
import pe.ebyzom.lumen.ui.theme.LumenTeleprompterTheme
import pe.ebyzom.lumen.viewmodel.ScriptViewModel
import pe.ebyzom.lumen.viewmodel.ScriptViewModelFactory

class MainActivity : ComponentActivity() {

    private val db by lazy {
        AppDatabase.getDatabase(applicationContext)
    }

    private val repository by lazy { ScriptRepository(db.scriptDao()) }

    private val viewModel: ScriptViewModel by viewModels {
        ScriptViewModelFactory(repository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        setContent {
            LumenTeleprompterTheme {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                val currentScript by viewModel.currentScript.collectAsState()
                var showMenuSheet by remember { mutableStateOf(false) }
                var showManualDialog by remember { mutableStateOf(false) }
                var showDonationDialog by remember { mutableStateOf(false) }
                var showPrivacyPolicyDialog by remember { mutableStateOf(false) }

                val isTeleprompter = currentRoute?.contains("teleprompter") == true
                val isSettings = currentRoute == Screen.Settings.route
                val hideStudioChrome = isTeleprompter || isSettings

                Scaffold(
                    containerColor = pe.ebyzom.lumen.ui.theme.LumenBg,
                    topBar = {
                        if (!hideStudioChrome) {
                            LumenHeader(
                                activeScriptTitle = currentScript?.title ?: "Sin Guión",
                                onOpenSettings = { navController.navigate(Screen.Settings.route) }
                            )
                        }
                    },
                    bottomBar = {
                        if (!hideStudioChrome) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(pe.ebyzom.lumen.ui.theme.LumenPaper)
                                    .navigationBarsPadding()
                            ) {
                                AdBanner(
                                    adUnitId = "ca-app-pub-7470413991742442/4821639268"
                                )
                                LumenBottomNav(
                                    currentRoute = currentRoute,
                                    onNavigate = { route ->
                                        navController.navigate(route) {
                                            popUpTo(navController.graph.startDestinationId)
                                            launchSingleTop = true
                                        }
                                    },
                                    onLaunchReading = {
                                        val id = currentScript?.id
                                            ?: viewModel.allScripts.value.firstOrNull()?.id
                                            ?: 1L
                                        navController.navigate(Screen.Teleprompter.createRoute(id))
                                    },
                                    onMenuClick = { showMenuSheet = true }
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                        NavGraph(navController = navController, viewModel = viewModel)
                    }

                    if (showMenuSheet) {
                        LumenMenuSheet(
                            onDismiss = { showMenuSheet = false },
                            onOpenSettings = {
                                navController.navigate(Screen.Settings.route)
                            },
                            onOpenManual = {
                                showManualDialog = true
                            },
                            onOpenDonation = {
                                showDonationDialog = true
                            },
                            onOpenPrivacyPolicy = {
                                showPrivacyPolicyDialog = true
                            }
                        )
                    }

                    if (showManualDialog) {
                        UserManualDialog(
                            onDismiss = { showManualDialog = false }
                        )
                    }

                    if (showDonationDialog) {
                        DonationDialog(
                            onDismiss = { showDonationDialog = false }
                        )
                    }

                    if (showPrivacyPolicyDialog) {
                        pe.ebyzom.lumen.ui.components.PrivacyPolicyDialog(
                            onDismiss = { showPrivacyPolicyDialog = false }
                        )
                    }
                }
            }
        }
    }
}
