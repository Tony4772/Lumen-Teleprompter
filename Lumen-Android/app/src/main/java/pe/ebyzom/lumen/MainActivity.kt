package pe.ebyzom.lumen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
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
