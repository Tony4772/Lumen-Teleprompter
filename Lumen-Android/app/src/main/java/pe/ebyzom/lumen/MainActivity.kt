package pe.ebyzom.lumen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import androidx.room.Room
import pe.ebyzom.lumen.data.local.AppDatabase
import pe.ebyzom.lumen.data.repository.ScriptRepository
import pe.ebyzom.lumen.navigation.NavGraph
import pe.ebyzom.lumen.ui.theme.LumenTeleprompterTheme
import pe.ebyzom.lumen.viewmodel.ScriptViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Inicialización de la base de datos (En una app real esto iría en una clase Application o Hilt)
        val db = Room.databaseBuilder(
            applicationContext,
            AppDatabase::class.java, "lumen-db"
        ).build()
        
        val repository = ScriptRepository(db.scriptDao())
        val viewModel = ScriptViewModel(repository)

        setContent {
            LumenTeleprompterTheme {
                val navController = rememberNavController()
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NavGraph(navController = navController, viewModel = viewModel)
                }
            }
        }
    }
}
