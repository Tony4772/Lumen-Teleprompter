package pe.ebyzom.lumen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.room.Room
import pe.ebyzom.lumen.data.local.AppDatabase
import pe.ebyzom.lumen.data.repository.ScriptRepository
import pe.ebyzom.lumen.navigation.NavGraph
import pe.ebyzom.lumen.navigation.Screen
import pe.ebyzom.lumen.ui.components.LumenBottomNav
import pe.ebyzom.lumen.ui.components.LumenHeader
import pe.ebyzom.lumen.ui.components.LumenMenuSheet
import pe.ebyzom.lumen.ui.theme.LumenTeleprompterTheme
import pe.ebyzom.lumen.viewmodel.ScriptViewModel
import pe.ebyzom.lumen.viewmodel.ScriptViewModelFactory

class MainActivity : ComponentActivity() {
    
    private val db by lazy {
        Room.databaseBuilder(
            applicationContext,
            AppDatabase::class.java, "lumen-db"
        ).fallbackToDestructiveMigration().build()
    }
    
    private val repository by lazy { ScriptRepository(db.scriptDao()) }
    
    private val viewModel: ScriptViewModel by viewModels {
        ScriptViewModelFactory(repository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            LumenTeleprompterTheme {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route
                
                val currentScript by viewModel.currentScript.collectAsState()
                var showMenuSheet by remember { mutableStateOf(false) }

                val isTeleprompter = currentRoute?.contains("teleprompter") == true
                
                Scaffold(
                    topBar = {
                        if (!isTeleprompter) {
                            LumenHeader(
                                activeScriptTitle = currentScript?.title ?: "Sin Guión",
                                onOpenSettings = { navController.navigate(Screen.Settings.route) }
                            )
                        }
                    },
                    bottomBar = {
                        if (!isTeleprompter) {
                            LumenBottomNav(
                                currentRoute = currentRoute,
                                onNavigate = { route -> 
                                    navController.navigate(route) {
                                        popUpTo(navController.graph.startDestinationId)
                                        launchSingleTop = true
                                    }
                                },
                                onMenuClick = { showMenuSheet = true }
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        NavGraph(navController = navController, viewModel = viewModel)
                    }

                    if (showMenuSheet) {
                        LumenMenuSheet(
                            onDismiss = { showMenuSheet = false },
                            onOpenAI = { 
                                navController.navigate(Screen.AIAtelier.route)
                            },
                            onOpenSettings = { 
                                navController.navigate(Screen.Settings.route)
                            },
                            onOpenManual = { /* TODO */ },
                            onOpenDonation = { /* TODO */ }
                        )
                    }
                }
            }
        }
    }
}
