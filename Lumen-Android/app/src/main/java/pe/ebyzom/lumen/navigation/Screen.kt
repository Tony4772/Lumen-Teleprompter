package pe.ebyzom.lumen.navigation

sealed class Screen(val route: String) {
    object ScriptList : Screen("script_list")
    object ScriptEditor : Screen("script_editor/{scriptId}") {
        fun createRoute(scriptId: Long) = "script_editor/$scriptId"
    }
    object Teleprompter : Screen("teleprompter/{scriptId}") {
        fun createRoute(scriptId: Long) = "teleprompter/$scriptId"
    }
}
