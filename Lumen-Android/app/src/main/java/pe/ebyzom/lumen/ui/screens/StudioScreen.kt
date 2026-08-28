package pe.ebyzom.lumen.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import pe.ebyzom.lumen.model.Script
import pe.ebyzom.lumen.ui.theme.*
import pe.ebyzom.lumen.viewmodel.ScriptViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudioScreen(
    viewModel: ScriptViewModel,
    onLaunchPrompter: (Long) -> Unit
) {
    val scripts by viewModel.allScripts.collectAsState()
    val currentScript by viewModel.currentScript.collectAsState()

    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }

    LaunchedEffect(currentScript) {
        currentScript?.let {
            title = it.title
            content = it.content
        } ?: if (scripts.isNotEmpty()) {
            viewModel.loadScript(scripts[0].id)
        }
    }

    val words = content.split("\\s+".toRegex()).filter { it.isNotEmpty() }.size
    val timeFormatted = String.format("%02d:%02d", words / 135, (words % 135) * 60 / 135)

    Column(modifier = Modifier.fillMaxSize().background(LumenBg)) {
        // Script Selection Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(LumenPaper)
                .drawBehind {
                    drawLine(LumenBorder, Offset(0f, size.height), Offset(size.width, size.height), 2f)
                }
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            var expanded by remember { mutableStateOf(false) }

            Box(modifier = Modifier.weight(1f)) {
                Surface(
                    onClick = { expanded = true },
                    color = Color.White,
                    border = androidx.compose.foundation.BorderStroke(1.dp, LumenBorder),
                    shape = RoundedCornerShape(2.dp),
                    modifier = Modifier.fillMaxWidth().height(36.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = currentScript?.title ?: "Seleccionar guión...",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = LumenInk
                        )
                        Icon(Icons.Default.ArrowDropDown, "", tint = LumenGray)
                    }
                }

                DropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false },
                    modifier = Modifier.fillMaxWidth(0.9f).background(Color.White)
                ) {
                    scripts.forEach { s ->
                        DropdownMenuItem(
                            text = { Text(s.title, fontSize = 14.sp) },
                            onClick = {
                                viewModel.loadScript(s.id)
                                expanded = false
                            }
                        )
                    }
                }
            }

            Spacer(Modifier.width(8.dp))

            IconButton(
                onClick = { viewModel.saveScript("Nuevo Guión", "") },
                modifier = Modifier.size(36.dp).background(Color.White, CircleShape).border(1.dp, LumenBorder, CircleShape)
            ) {
                Icon(Icons.Default.Add, "", tint = LumenInk, modifier = Modifier.size(20.dp))
            }
        }

        // Editor Area
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
                .background(Color.White, RoundedCornerShape(4.dp))
                .border(1.dp, LumenBorder, RoundedCornerShape(4.dp))
                .padding(16.dp)
        ) {
            // Stats Row
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("$words PAL.", fontSize = 10.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = LumenGray)
                Spacer(Modifier.width(12.dp))
                Text("•", color = LumenBorder)
                Spacer(Modifier.width(12.dp))
                Text("EST. $timeFormatted", fontSize = 10.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = LumenGray)
                Spacer(Modifier.weight(1f))
                Button(
                    onClick = { onLaunchPrompter(currentScript?.id ?: -1L) },
                    colors = ButtonDefaults.buttonColors(containerColor = LumenInk),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp)
                ) {
                    Icon(Icons.Default.PlayArrow, "", modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("LEER", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }

            Divider(color = LumenBorder, modifier = Modifier.padding(vertical = 12.dp), thickness = 0.5.dp)

            TextField(
                value = title,
                onValueChange = {
                    title = it
                    currentScript?.let { s -> viewModel.saveScript(it, content, s.wpm) }
                },
                placeholder = { Text("Título del guión...", fontStyle = FontStyle.Italic, color = LumenMuted) },
                modifier = Modifier.fillMaxWidth(),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                ),
                textStyle = TextStyle(
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    fontStyle = FontStyle.Italic,
                    fontSize = 24.sp,
                    color = LumenInk
                )
            )

            TextField(
                value = content,
                onValueChange = {
                    content = it
                    currentScript?.let { s -> viewModel.saveScript(title, it, s.wpm) }
                },
                placeholder = { Text("Escribe aquí tu discurso...", color = LumenMuted) },
                modifier = Modifier.fillMaxWidth().weight(1f),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                ),
                textStyle = TextStyle(
                    fontFamily = FontFamily.Serif,
                    fontSize = 18.sp,
                    lineHeight = 28.sp,
                    color = LumenInk
                )
            )
        }
    }
}
