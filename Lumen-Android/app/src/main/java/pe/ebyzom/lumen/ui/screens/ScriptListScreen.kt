package pe.ebyzom.lumen.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pe.ebyzom.lumen.model.Script
import pe.ebyzom.lumen.viewmodel.ScriptViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScriptListScreen(
    viewModel: ScriptViewModel,
    onNavigateToEditor: (Long) -> Unit,
    onNavigateToPrompter: (Long) -> Unit
) {
    val scripts by viewModel.allScripts.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Lumen Scripts", fontWeight = FontWeight.Bold) }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { onNavigateToEditor(-1L) }) {
                Icon(Icons.Default.Add, contentDescription = "Nuevo Guión")
            }
        }
    ) { padding ->
        if (scripts.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text("No tienes guiones aún. ¡Crea el primero!", color = MaterialTheme.colorScheme.secondary)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(scripts) { script ->
                    ScriptItem(
                        script = script,
                        onClick = { onNavigateToEditor(script.id) },
                        onPrompterClick = { onNavigateToPrompter(script.id) },
                        onDelete = { viewModel.deleteScript(script) }
                    )
                }
            }
        }
    }
}

@Composable
fun ScriptItem(
    script: Script,
    onClick: () -> Unit,
    onPrompterClick: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = script.title, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text(
                    text = "${script.content.take(60)}...",
                    color = MaterialTheme.colorScheme.secondary,
                    fontSize = 14.sp
                )
            }
            Row {
                IconButton(onClick = onPrompterClick) {
                    Text("▶️") // Placeholder para icono de play
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}
