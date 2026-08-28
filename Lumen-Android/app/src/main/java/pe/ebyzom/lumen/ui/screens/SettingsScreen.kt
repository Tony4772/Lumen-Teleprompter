package pe.ebyzom.lumen.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
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
    val settings by viewModel.settings.collectAsState()

    Scaffold(
        containerColor = LumenBg,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = LumenPaper),
                title = { Text("CONFIGURACIÓN", fontWeight = FontWeight.Bold, fontSize = 16.sp, letterSpacing = 2.sp) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "", tint = LumenInk)
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
            SettingSection("VISUALIZACIÓN") {
                SettingSlider("Tamaño de letra", settings.fontSize.toFloat(), 20f, 120f) {
                    viewModel.updateSettings(settings.copy(fontSize = it.toInt()))
                }
                SettingSlider("Margen de seguridad", settings.safeMargin.toFloat(), 5f, 35f) {
                    viewModel.updateSettings(settings.copy(safeMargin = it.toInt()))
                }
            }

            Spacer(Modifier.height(24.dp))

            SettingSection("HARDWARE") {
                SettingToggle("Modo Espejo (X)", settings.mirrorX) {
                    viewModel.updateSettings(settings.copy(mirrorX = it))
                }
                SettingToggle("Inversión Vertical (Y)", settings.mirrorY) {
                    viewModel.updateSettings(settings.copy(mirrorY = it))
                }
            }
        }
    }
}

@Composable
fun SettingSection(title: String, content: @Composable () -> Unit) {
    Column {
        Text(title, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = LumenGray, letterSpacing = 1.sp)
        Spacer(Modifier.height(12.dp))
        Surface(
            color = Color.White, 
            shape = RoundedCornerShape(8.dp), 
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
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, fontSize = 14.sp, color = LumenInk)
            Text("${value.toInt()}", fontSize = 14.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = min..max,
            colors = SliderDefaults.colors(
                thumbColor = LumenAccent, 
                activeTrackColor = LumenAccent
            )
        )
    }
}

@Composable
fun SettingToggle(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 14.sp, color = LumenInk)
        Switch(
            checked = checked, 
            onCheckedChange = onCheckedChange, 
            colors = SwitchDefaults.colors(checkedThumbColor = LumenAccent)
        )
    }
}
