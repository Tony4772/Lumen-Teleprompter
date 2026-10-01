package pe.ebyzom.lumen.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pe.ebyzom.lumen.ui.theme.*
import pe.ebyzom.lumen.viewmodel.ScriptViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: ScriptViewModel,
    onNavigateBack: () -> Unit
) {
    BackHandler { onNavigateBack() }

    val settings by viewModel.settings.collectAsState()

    Scaffold(
        containerColor = LumenBg,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = LumenPaper,
                    titleContentColor = LumenInk,
                    navigationIconContentColor = LumenInk
                ),
                title = { Text("CONFIGURACIÓN", fontWeight = FontWeight.Bold, fontSize = 16.sp, letterSpacing = 2.sp, color = LumenInk) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Volver", tint = LumenInk)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp)
        ) {
            // VELOCIDAD
            SettingSection(
                title = "VELOCIDAD DE DESPLAZAMIENTO DEL TEXTO",
                subtitle = "Controla qué tan rápido avanza el guión en el teleprompter mientras lees (palabras por minuto)."
            ) {
                SettingSlider(
                    label = "Velocidad Predeterminada",
                    value = settings.wpm.toFloat(),
                    min = 5f,
                    max = 650f
                ) {
                    viewModel.updateSettings(settings.copy(wpm = it.toInt()))
                }

                Spacer(Modifier.height(8.dp))
                Text("Accesos rápidos de velocidad:", fontSize = 11.sp, color = LumenGray)
                Spacer(Modifier.height(6.dp))

                val speedPresets = listOf(
                    15 to "15 Ultra Lenta",
                    45 to "45 Lenta",
                    90 to "90 Pausada",
                    135 to "135 Normal",
                    180 to "180 Ágil",
                    260 to "260 Rápida",
                    450 to "450 Ultra Rápida"
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    speedPresets.forEach { (speedValue, speedLabel) ->
                        val isSelected = settings.wpm == speedValue
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.updateSettings(settings.copy(wpm = speedValue)) },
                            label = { Text(speedLabel, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = LumenAccent,
                                selectedLabelColor = LumenOnCta,
                                containerColor = LumenOverlay,
                                labelColor = LumenInk
                            )
                        )
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // TAMAÑO DE FUENTE DE LECTURA (TELEPROMPTER)
            SettingSection(
                title = "TAMAÑO DE FUENTE DE LECTURA (TELEPROMPTER)",
                subtitle = "Controla exclusivamente el tamaño de las letras en la pantalla de teleprompter mientras lees. No modifica el tamaño del editor de guiones."
            ) {
                SettingSlider(
                    label = "Tamaño de Fuente Prompter",
                    value = settings.fontSize.toFloat(),
                    min = 20f,
                    max = 96f
                ) {
                    viewModel.updateSettings(settings.copy(fontSize = it.toInt()))
                }

                Spacer(Modifier.height(8.dp))

                // Vista previa de lectura
                Surface(
                    color = Color.Black,
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
                ) {
                    Text(
                        text = "Vista previa del teleprompter a ${settings.fontSize} pt",
                        color = Color.White,
                        fontSize = (settings.fontSize * 0.55).sp,
                        lineHeight = (settings.fontSize * 0.55 * settings.lineHeight).sp,
                        fontWeight = FontWeight.Medium,
                        fontFamily = when (settings.fontFamily.lowercase()) {
                            "sans" -> FontFamily.SansSerif
                            "mono" -> FontFamily.Monospace
                            else -> FontFamily.Serif
                        },
                        modifier = Modifier.padding(14.dp)
                    )
                }

                Spacer(Modifier.height(12.dp))

                SettingSlider(
                    label = "Margen Lateral de Seguridad (%)",
                    value = settings.safeMargin.toFloat(),
                    min = 5f,
                    max = 30f
                ) {
                    viewModel.updateSettings(settings.copy(safeMargin = it.toInt()))
                }
            }

            Spacer(Modifier.height(20.dp))

            // TIPOGRAFÍA
            SettingSection("TIPOGRAFÍA DEL TELEPROMPTER") {
                val fonts = listOf("Serif", "Sans", "Mono")
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    fonts.forEach { fontName ->
                        val isSelected = settings.fontFamily.equals(fontName, ignoreCase = true)
                        Button(
                            onClick = { viewModel.updateSettings(settings.copy(fontFamily = fontName)) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isSelected) LumenAccent else LumenOverlay,
                                contentColor = if (isSelected) LumenOnCta else LumenInk
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(fontName, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // HARDWARE & ÓPTICA
            SettingSection("HARDWARE & ÓPTICA (CRISTAL DIVISOR)") {
                SettingToggle(
                    label = "Modo Espejo Horizontal (Mirror X para Teleprompter Rigs)",
                    checked = settings.mirrorX
                ) {
                    viewModel.updateSettings(settings.copy(mirrorX = it))
                }
                SettingToggle(
                    label = "Inversión Vertical (Mirror Y)",
                    checked = settings.mirrorY
                ) {
                    viewModel.updateSettings(settings.copy(mirrorY = it))
                }
                SettingToggle(
                    label = "Cámara en Vivo en Fondo",
                    checked = settings.cameraOverlay
                ) {
                    viewModel.updateSettings(settings.copy(cameraOverlay = it))
                }
            }

            Spacer(Modifier.height(20.dp))

            // PRIVACIDAD Y LEGAL
            var showPrivacyDialog by remember { mutableStateOf(false) }

            SettingSection("PRIVACIDAD Y GOOGLE PLAY POLICIES") {
                Text(
                    "Todos tus guiones y grabaciones se guardan localmente en tu dispositivo. Consulta la política completa requerida para Google Play y AdMob.",
                    fontSize = 12.sp,
                    color = LumenGray,
                    lineHeight = 16.sp
                )
                Spacer(Modifier.height(12.dp))
                OutlinedButton(
                    onClick = { showPrivacyDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Lock, "", modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("VER POLÍTICA DE PRIVACIDAD", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }

            if (showPrivacyDialog) {
                pe.ebyzom.lumen.ui.components.PrivacyPolicyDialog(
                    onDismiss = { showPrivacyDialog = false }
                )
            }
        }
    }
}

@Composable
fun SettingSection(title: String, subtitle: String? = null, content: @Composable () -> Unit) {
    Column {
        Text(title, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = LumenGray, letterSpacing = 1.sp)
        if (!subtitle.isNullOrBlank()) {
            Spacer(Modifier.height(2.dp))
            Text(subtitle, fontSize = 11.sp, color = LumenMuted, lineHeight = 15.sp)
        }
        Spacer(Modifier.height(8.dp))
        Surface(
            color = LumenPaper,
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, LumenBorder)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                content()
            }
        }
    }
}

@Composable
fun SettingSlider(label: String, value: Float, min: Float, max: Float, onValueChange: (Float) -> Unit) {
    Column(modifier = Modifier.padding(vertical = 6.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, fontSize = 13.sp, color = LumenInk)
            Text("${value.toInt()}", fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = min..max,
            colors = SliderDefaults.colors(
                thumbColor = LumenAccent,
                activeTrackColor = LumenAccent,
                inactiveTrackColor = LumenBorder
            )
        )
    }
}

@Composable
fun SettingToggle(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 13.sp, color = LumenInk, modifier = Modifier.weight(1f))
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = LumenOnCta,
                checkedTrackColor = LumenAccent
            )
        )
    }
}
