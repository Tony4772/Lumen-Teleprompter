package pe.ebyzom.lumen.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pe.ebyzom.lumen.ui.theme.*
import pe.ebyzom.lumen.viewmodel.ScriptViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScriptEditorScreen(
    viewModel: ScriptViewModel,
    scriptId: Long,
    onNavigateBack: () -> Unit
) {
    val script by viewModel.currentScript.collectAsState()
    
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var wpm by remember { mutableIntStateOf(135) }

    LaunchedEffect(scriptId) {
        if (scriptId != -1L) {
            viewModel.loadScript(scriptId)
        }
    }

    LaunchedEffect(script) {
        script?.let {
            title = it.title
            content = it.content
            wpm = it.wpm
        }
    }

    val words = content.split("\\s+".toRegex()).filter { it.isNotEmpty() }.size
    val estimatedMinutes = if (wpm > 0) words / wpm.toDouble() else 0.0
    val timeFormatted = String.format("%02d:%02d", estimatedMinutes.toInt(), ((estimatedMinutes % 1) * 60).toInt())

    Scaffold(
        containerColor = LumenBg,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = LumenPaper,
                    titleContentColor = LumenInk
                ),
                title = { 
                    Text(
                        if (scriptId == -1L) "Nuevo Guión" else "Editar Guión",
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        fontStyle = FontStyle.Italic,
                        fontSize = 18.sp
                    ) 
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Atrás", tint = LumenInk)
                    }
                },
                actions = {
                    IconButton(onClick = { /* TODO: IA Atelier */ }) {
                        Icon(Icons.Default.Star, "IA Atelier", tint = LumenInk)
                    }
                    Spacer(Modifier.width(8.dp))
                    Button(
                        onClick = {
                            viewModel.saveScript(title, content, wpm)
                            onNavigateBack()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = LumenInk),
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        modifier = Modifier.padding(end = 8.dp).height(36.dp),
                        shape = RoundedCornerShape(18.dp)
                    ) {
                        Icon(Icons.Default.Check, "", modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("GUARDAR", fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Editorial Stats Bar
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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Info, "", tint = LumenGray, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "$words PALABRAS",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = LumenInk,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.width(12.dp))
                    Text("•", color = LumenBorder)
                    Spacer(Modifier.width(12.dp))
                    Text(
                        "EST. $timeFormatted",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = LumenInk,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                Text(
                    "${wpm} WPM",
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = LumenGray
                )
            }

            // Editor Area
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
                    .background(Color.White, RoundedCornerShape(4.dp))
                    .drawBehind {
                        val stroke = 1.dp.toPx()
                        drawRect(
                            color = LumenBorder,
                            style = androidx.compose.ui.graphics.drawscope.Stroke(stroke)
                        )
                    }
                    .padding(16.dp)
            ) {
                TextField(
                    value = title,
                    onValueChange = { title = it },
                    placeholder = { 
                        Text(
                            "Título del guión...", 
                            fontFamily = FontFamily.Serif, 
                            fontStyle = FontStyle.Italic,
                            fontSize = 20.sp,
                            color = LumenGray.copy(alpha = 0.5f)
                        ) 
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        disabledContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                    ),
                    textStyle = TextStyle(
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        fontStyle = FontStyle.Italic,
                        fontSize = 22.sp,
                        color = LumenInk
                    ),
                    singleLine = true
                )
                
                Divider(color = LumenBorder, modifier = Modifier.padding(vertical = 8.dp), thickness = 0.5.dp)
                
                TextField(
                    value = content,
                    onValueChange = { content = it },
                    placeholder = { 
                        Text(
                            "Escribe o pega aquí tu discurso...",
                            fontSize = 16.sp,
                            color = LumenGray.copy(alpha = 0.5f)
                        ) 
                    },
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        disabledContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                    ),
                    textStyle = TextStyle(
                        fontFamily = FontFamily.Serif,
                        fontSize = 17.sp,
                        lineHeight = 26.sp,
                        color = LumenInk
                    )
                )
            }
        }
    }
}
