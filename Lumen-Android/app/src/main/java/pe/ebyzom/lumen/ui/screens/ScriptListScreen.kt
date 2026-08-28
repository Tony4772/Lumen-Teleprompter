package pe.ebyzom.lumen.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pe.ebyzom.lumen.model.Script
import pe.ebyzom.lumen.ui.theme.LumenBg
import pe.ebyzom.lumen.ui.theme.LumenBorder
import pe.ebyzom.lumen.ui.theme.LumenInk
import pe.ebyzom.lumen.ui.theme.LumenPaper
import pe.ebyzom.lumen.ui.theme.LumenGray
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
        containerColor = LumenBg,
        topBar = {
            CenterAlignedTopAppBar(
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = LumenPaper,
                    titleContentColor = LumenInk
                ),
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(
                                "Lumen.",
                                fontFamily = FontFamily.Serif,
                                fontStyle = FontStyle.Italic,
                                fontWeight = FontWeight.Bold,
                                fontSize = 28.sp,
                                letterSpacing = (-1).sp
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                "STUDIO",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 2.sp,
                                color = LumenGray,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { onNavigateToEditor(-1L) },
                containerColor = LumenInk,
                contentColor = LumenBg,
                shape = CircleShape,
                modifier = Modifier.size(56.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Nuevo Guión")
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Header Stats like web
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(LumenPaper)
                    .drawBehind {
                        drawLine(
                            color = LumenBorder,
                            start = Offset(0f, size.height),
                            end = Offset(size.width, size.height),
                            strokeWidth = 2f
                        )
                    }
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "BIBLIOTECA DE GUIONES",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                    color = LumenGray
                )
                Text(
                    "${scripts.size} DISCURSOS",
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = LumenInk
                )
            }

            if (scripts.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "No tienes guiones aún.",
                        fontFamily = FontFamily.Serif,
                        fontStyle = FontStyle.Italic,
                        color = LumenGray
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(scripts) { script ->
                        ScriptCard(
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
}

@Composable
fun ScriptCard(
    script: Script,
    onClick: () -> Unit,
    onPrompterClick: () -> Unit,
    onDelete: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(2.dp))
            .clickable { onClick() },
        color = Color.White,
        border = BorderStroke(1.dp, LumenBorder),
        shadowElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = script.title.ifEmpty { "Sin Título" },
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        fontStyle = FontStyle.Italic,
                        color = LumenInk
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = script.content.take(80).replace("\n", " ") + "...",
                        fontSize = 13.sp,
                        color = LumenGray,
                        lineHeight = 18.sp
                    )
                }
            }
            
            Spacer(Modifier.height(16.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val words = script.content.split("\\s+".toRegex()).filter { it.isNotEmpty() }.size
                    Text(
                        "$words pal.",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = LumenGray
                    )
                    Spacer(Modifier.width(8.dp))
                    Text("•", color = LumenBorder)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "${script.wpm} WPM",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = LumenGray
                    )
                }
                
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(32.dp).background(Color(0xFFFEE2E2), CircleShape)
                    ) {
                        Icon(Icons.Default.Delete, "Eliminar", tint = Color(0xFFB91C1C), modifier = Modifier.size(16.dp))
                    }
                    Button(
                        onClick = onPrompterClick,
                        colors = ButtonDefaults.buttonColors(containerColor = LumenInk),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                        modifier = Modifier.height(32.dp),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, "Leer", modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("LEER", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
