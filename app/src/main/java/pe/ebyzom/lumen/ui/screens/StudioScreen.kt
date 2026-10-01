package pe.ebyzom.lumen.ui.screens

import android.content.Intent
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import pe.ebyzom.lumen.ui.theme.*
import pe.ebyzom.lumen.util.DocumentParser
import pe.ebyzom.lumen.viewmodel.ScriptViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudioScreen(
    viewModel: ScriptViewModel,
    onLaunchPrompter: (Long) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val scripts by viewModel.allScripts.collectAsState()
    val currentScript by viewModel.currentScript.collectAsState()

    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    // File import state
    var importedScriptId by remember { mutableStateOf<Long?>(null) }
    var importedScriptTitle by remember { mutableStateOf("") }
    var showImportedDialog by remember { mutableStateOf(false) }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            scope.launch {
                try {
                    val parsed = withContext(Dispatchers.IO) {
                        DocumentParser.parse(context, uri)
                    }
                    title = parsed.title
                    content = parsed.content
                    importedScriptTitle = parsed.title
                    viewModel.importScript(parsed.title, parsed.content) { newId ->
                        importedScriptId = newId
                        showImportedDialog = true
                    }
                    Toast.makeText(context, "Archivo cargado: ${parsed.title}", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Toast.makeText(context, "Error al leer archivo: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        viewModel.cleanEmptyScripts()
    }

    LaunchedEffect(currentScript) {
        val script = currentScript
        if (script != null) {
            title = if (script.title == "Nuevo Guión" && script.content.isEmpty()) "" else script.title
            content = script.content
        } else if (scripts.isNotEmpty()) {
            viewModel.loadScript(scripts[0].id)
        }
    }

    val words = content.split("\\s+".toRegex()).filter { it.isNotEmpty() }.size
    val currentWpm = currentScript?.wpm ?: 135
    val estimatedSeconds = if (currentWpm > 0) (words * 60) / currentWpm else 0
    val timeFormatted = String.format("%02d:%02d", estimatedSeconds / 60, estimatedSeconds % 60)

    Column(modifier = Modifier.fillMaxSize().background(LumenBg)) {
        // Script Selection & File Import Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(LumenPaper)
                .drawBehind {
                    drawLine(LumenBorder, Offset(0f, size.height), Offset(size.width, size.height), 2f)
                }
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            var expanded by remember { mutableStateOf(false) }

            // Dropdown selector
            Box(modifier = Modifier.weight(1f)) {
                Surface(
                    onClick = { expanded = true },
                    color = LumenPaper,
                    border = androidx.compose.foundation.BorderStroke(1.dp, LumenBorder),
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.fillMaxWidth().height(40.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = if (currentScript != null) currentScript!!.title else if (title.isNotEmpty()) title else "Nuevo Guión (Borrador)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = LumenInk,
                            maxLines = 1
                        )
                        Icon(Icons.Default.ArrowDropDown, "Desplegar", tint = LumenGray)
                    }
                }

                DropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false },
                    modifier = Modifier.fillMaxWidth(0.9f).background(LumenPaper)
                ) {
                    scripts.forEach { s ->
                        DropdownMenuItem(
                            text = {
                                Column {
                                    Text(s.title, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Text(
                                        "${s.content.take(40)}...",
                                        fontSize = 11.sp,
                                        color = LumenGray
                                    )
                                }
                            },
                            onClick = {
                                viewModel.loadScript(s.id)
                                expanded = false
                            }
                        )
                    }
                }
            }

            Spacer(Modifier.width(8.dp))

            // Clear "+ NUEVO" Button (Creates a clean blank script ready for writing or pasting)
            Button(
                onClick = {
                    viewModel.createNewBlankScript {
                        title = ""
                        content = ""
                        Toast.makeText(context, "Nuevo guión listo para escribir o pegar", Toast.LENGTH_SHORT).show()
                    }
                },
                shape = RoundedCornerShape(6.dp),
                colors = ButtonDefaults.buttonColors(containerColor = LumenCta, contentColor = LumenOnCta),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                modifier = Modifier.height(40.dp)
            ) {
                Icon(Icons.Default.Add, "", tint = LumenOnCta, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("NUEVO", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = LumenOnCta)
            }

            Spacer(Modifier.width(6.dp))

            // Import Document Button (TXT, PDF, DOCX) - Prominent & Clearly Labeled
            Button(
                onClick = {
                    filePickerLauncher.launch(
                        arrayOf(
                            "text/plain",
                            "text/rtf",
                            "application/pdf",
                            "application/msword",
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            "*/*"
                        )
                    )
                },
                shape = RoundedCornerShape(6.dp),
                colors = ButtonDefaults.buttonColors(containerColor = LumenCta, contentColor = LumenOnCta),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                modifier = Modifier.height(40.dp)
            ) {
                Icon(Icons.Default.UploadFile, "", tint = LumenOnCta, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("CARGAR", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = LumenOnCta)
            }

            // Share Script
            if (currentScript != null) {
                Spacer(Modifier.width(4.dp))
                IconButton(
                    onClick = {
                        val sendIntent = Intent().apply {
                            action = Intent.ACTION_SEND
                            putExtra(Intent.EXTRA_TITLE, title)
                            putExtra(Intent.EXTRA_TEXT, "$title\n\n$content")
                            type = "text/plain"
                        }
                        context.startActivity(Intent.createChooser(sendIntent, "Compartir guión"))
                    },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(Icons.Default.Share, "Compartir", tint = LumenInk, modifier = Modifier.size(18.dp))
                }

                // Delete Script
                IconButton(
                    onClick = { showDeleteConfirm = true },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(Icons.Default.Delete, "Eliminar", tint = LumenRed, modifier = Modifier.size(18.dp))
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        // Editor Surface Area (Fixed standard font size in editor, does not change with prompter font size)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 4.dp)
                .background(LumenPaper, RoundedCornerShape(12.dp))
                .border(1.dp, LumenBorder, RoundedCornerShape(12.dp))
                .padding(16.dp)
        ) {
            // Stats Row & Launch Prompter
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "$words PALABRAS",
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    color = LumenGray
                )
                Spacer(Modifier.width(10.dp))
                Text("•", color = LumenBorder)
                Spacer(Modifier.width(10.dp))
                Text(
                    "EST. $timeFormatted",
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    color = LumenGray
                )
                Spacer(Modifier.weight(1f))

                // Primary Start Prompter Button
                Button(
                    onClick = {
                        val scriptId = currentScript?.id ?: -1L
                        if (scriptId != -1L) {
                            onLaunchPrompter(scriptId)
                        } else {
                            viewModel.saveScript(title.ifEmpty { "Guión" }, content)
                            if (scripts.isNotEmpty()) {
                                onLaunchPrompter(scripts[0].id)
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = LumenCta, contentColor = LumenOnCta),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.height(36.dp),
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 0.dp)
                ) {
                    Icon(Icons.Default.PlayArrow, "Leer", modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("INICIAR PROMPTER", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            HorizontalDivider(color = LumenBorder, modifier = Modifier.padding(vertical = 12.dp))

            // Script Title Input
            TextField(
                value = title,
                onValueChange = {
                    title = it
                    val s = currentScript
                    viewModel.saveScript(it, content, s?.wpm)
                },
                placeholder = {
                    Text("Título del guión...", fontStyle = FontStyle.Italic, color = LumenMuted)
                },
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
                    fontSize = 22.sp,
                    color = LumenInk
                )
            )

            // Script Content Area (Standard editor font size 17sp, fixed and readable)
            TextField(
                value = content,
                onValueChange = {
                    content = it
                    val s = currentScript
                    viewModel.saveScript(title, it, s?.wpm)
                },
                placeholder = {
                    Text("Escribe aquí tu discurso o pega tu texto...", color = LumenMuted)
                },
                modifier = Modifier.fillMaxWidth().weight(1f),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
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

    // File Imported Ready to Read Dialog
    if (showImportedDialog) {
        AlertDialog(
            onDismissRequest = { showImportedDialog = false },
            icon = {
                Icon(Icons.Default.CheckCircle, "", tint = LumenAccent, modifier = Modifier.size(36.dp))
            },
            title = { Text("¡Archivo Cargado con Éxito!", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("El documento \"$importedScriptTitle\" ha sido importado con $words palabras y ya está listo para leer.")
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Puedes comenzar la lectura en el teleprompter de inmediato o revisarlo en el editor.",
                        fontSize = 12.sp,
                        color = LumenGray
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showImportedDialog = false
                        val idToOpen = importedScriptId ?: currentScript?.id ?: scripts.firstOrNull()?.id
                        if (idToOpen != null) {
                            onLaunchPrompter(idToOpen)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = LumenCta, contentColor = LumenOnCta)
                ) {
                    Icon(Icons.Default.PlayArrow, "", modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("LEER AHORA", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showImportedDialog = false }) {
                    Text("EDITAR GUION")
                }
            }
        )
    }

    // Delete confirmation dialog
    if (showDeleteConfirm && currentScript != null) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("¿Eliminar guión?", fontWeight = FontWeight.Bold) },
            text = { Text("Se eliminará permanentemente \"${currentScript?.title}\". Esta acción no se puede deshacer.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        currentScript?.let { viewModel.deleteScript(it) }
                        showDeleteConfirm = false
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = LumenRed)
                ) {
                    Text("ELIMINAR", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("CANCELAR")
                }
            }
        )
    }
}
