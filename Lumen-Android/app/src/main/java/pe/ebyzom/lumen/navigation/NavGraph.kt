package pe.ebyzom.lumen.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import pe.ebyzom.lumen.ui.screens.*
import pe.ebyzom.lumen.viewmodel.ScriptViewModel

@Composable
fun NavGraph(
    navController: NavHostController,
    viewModel: ScriptViewModel
) {
    NavHost(
        navController = navController,
        startDestination = Screen.ScriptList.route
    ) {
        composable(Screen.ScriptList.route) {
            StudioScreen(
                viewModel = viewModel,
                onLaunchPrompter = { id ->
                    navController.navigate(Screen.Teleprompter.createRoute(id))
                }
            )
        }
        
        composable(
            route = Screen.Teleprompter.route,
            arguments = listOf(navArgument("scriptId") { type = NavType.LongType })
        ) { backStackEntry ->
            val scriptId = backStackEntry.arguments?.getLong("scriptId") ?: -1L
            TeleprompterScreen(
                viewModel = viewModel,
                scriptId = scriptId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.AIAtelier.route) {
            AIAtelierScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
