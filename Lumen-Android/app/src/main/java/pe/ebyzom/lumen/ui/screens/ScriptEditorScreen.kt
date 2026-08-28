package pe.ebyzom.lumen.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import pe.ebyzom.lumen.viewmodel.ScriptViewModel

@OptIn(Material3Api::class)
@Composable
fun ScriptEditorScreen(
    viewModel: ScriptViewModel,
    scriptId: Long,
    onNavigateBack: () -> Unit
) {
    val script by viewModel.currentScript.collectAsState()
    
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }

    LaunchedEffect(scriptId) {
        if (scriptId != -1L) {
            viewModel.loadScript(scriptId)
        }
    }

    LaunchedEffect(script) {
        script?.let {
            title = it.title
            content = it.content
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (scriptId == -1L) "Nuevo Guión" else "Editar Guión") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Atrás")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        viewModel.saveScript(title, content)
                        onNavigateBack()
                    }) {
                        Icon(Icons.Default.Check, contentDescription = "Guardar")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            TextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Título") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(16.dp))
            TextField(
                value = content,
                onValueChange = { content = it },
                label = { Text("Contenido del guión") },
                modifier = Modifier.fillWeight(1f).fillMaxWidth(),
                maxLines = Int.MAX_VALUE
            )
        }
    }
}

// Extensión temporal para facilitar el layout
fun Modifier.fillWeight(weight: Float): Modifier = this.then(Modifier.weight(weight))
