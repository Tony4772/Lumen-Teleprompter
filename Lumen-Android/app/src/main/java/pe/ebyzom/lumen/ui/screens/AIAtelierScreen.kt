package pe.ebyzom.lumen.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pe.ebyzom.lumen.ui.theme.*
import pe.ebyzom.lumen.viewmodel.ScriptViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIAtelierScreen(
    viewModel: ScriptViewModel,
    onNavigateBack: () -> Unit
) {
    var activeTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("GENERAR", "OPTIMIZAR", "TRADUCIR")
    
    val isLoading by viewModel.isAiLoading.collectAsState()
    val result by viewModel.aiResult.collectAsState()

    var topic by remember { mutableStateOf("") }

    Scaffold(
        containerColor = LumenBg,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = LumenPaper),
                title = { 
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Star, "", tint = LumenInk, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("IA ATELIER", fontWeight = FontWeight.Bold, fontSize = 16.sp, letterSpacing = 2.sp)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, "", tint = LumenInk)
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(
                selectedTabIndex = activeTab,
                containerColor = LumenPaper,
                contentColor = LumenInk
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = activeTab == index,
                        onClick = { activeTab = index },
                        text = { Text(title, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
                    )
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                if (activeTab == 0) {
                    Text("TEMA O PUNTOS CLAVE:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = LumenGray)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = topic,
                        onValueChange = { topic = it },
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                        placeholder = { Text("Ej: Presentación de resultados trimestrales...") },
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = LumenInk)
                    )
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = { viewModel.generateAiScript(topic, "Keynote", "Profesional", 2) },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LumenInk),
                        enabled = !isLoading && topic.isNotEmpty()
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                        } else {
                            Text("GENERAR CON GEMINI", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                result?.let { aiText ->
                    Spacer(Modifier.height(24.dp))
                    Text("RESULTADO DE LA IA:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = LumenGray)
                    Spacer(Modifier.height(8.dp))
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color.White,
                        shape = RoundedCornerShape(4.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, LumenBorder)
                    ) {
                        Text(
                            text = aiText,
                            fontFamily = FontFamily.Serif,
                            fontSize = 15.sp,
                            lineHeight = 22.sp,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = { 
                            viewModel.saveScript("Guión IA", aiText)
                            onNavigateBack()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = LumenGreen)
                    ) {
                        Text("USAR ESTE GUIÓN", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
