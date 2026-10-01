package pe.ebyzom.lumen.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import pe.ebyzom.lumen.ui.theme.*

data class ManualSection(
    val title: String,
    val icon: ImageVector,
    val content: String
)

@Composable
fun UserManualDialog(
    onDismiss: () -> Unit
) {
    val sections = listOf(
        ManualSection(
            title = "Editor de Guiones (Studio)",
            icon = Icons.Default.Edit,
            content = "Crea, organiza y edita tus discursos. Puedes incluir marcas de dirección como [PAUSA 2s] o [MIRAR A CÁMARA] para marcar el ritmo escénico."
        ),
        ManualSection(
            title = "Modo Espejo (Teleprompter Rig)",
            icon = Icons.Default.Flip,
            content = "Activa el Modo Espejo Horizontal (Mirror X) para reflejar el texto en cristales divisores de haz de teleprompters profesionales sin distorsión."
        ),
        ManualSection(
            title = "Control de Velocidad (WPM)",
            icon = Icons.Default.Speed,
            content = "Ajusta la velocidad de lectura entre 10 y 600 palabras por minuto. La velocidad típica para oratoria ejecutiva es entre 130 y 150 WPM."
        ),
        ManualSection(
            title = "Cámara en Vivo de Fondo",
            icon = Icons.Default.Videocam,
            content = "Visualiza la cámara frontal en el fondo del teleprompter con opacidad suave para mantener el contacto visual directo con el lente mientras lees."
        ),
        ManualSection(
            title = "Línea de Enfoque Visual",
            icon = Icons.Default.Navigation,
            content = "La línea cian es la meta de lectura: el texto avanza por debajo de esa línea. A- y A+ cambian el tamaño de letra. El botón de lápiz vuelve al editor. Usa LEER para ensayar y GRABAR TOMA para guardar el video."
        ),
        ManualSection(
            title = "Carga de Archivos (TXT, PDF, DOC, DOCX)",
            icon = Icons.Default.UploadFile,
            content = "Importa guiones desde .txt, .pdf o Word (.doc / .docx). El PDF debe tener texto real (no una foto escaneada)."
        ),
        ManualSection(
            title = "Grabación en el Dispositivo",
            icon = Icons.Default.VideoCameraFront,
            content = "Graba tus tomas en la máxima calidad que permita tu cámara (hasta 4K / 1080p) y se guardan en la galería (Películas/Lumen)."
        )
    )

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = LumenBg,
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f),
            shadowElevation = 8.dp
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(LumenPaper)
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .background(LumenAccent, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.MenuBook, "", tint = LumenOnCta, modifier = Modifier.size(18.dp))
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                "Guía de Uso Lumen Studio",
                                fontFamily = FontFamily.Serif,
                                fontWeight = FontWeight.Bold,
                                fontStyle = FontStyle.Italic,
                                fontSize = 16.sp,
                                color = LumenInk
                            )
                            Text(
                                "MANUAL OFICIAL",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = LumenGray
                            )
                        }
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, "", tint = LumenInk)
                    }
                }

                HorizontalDivider(color = LumenBorder)

                // Content list
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    sections.forEach { section ->
                        Surface(
                            color = LumenOverlay,
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, LumenBorder)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .background(LumenPaper, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(section.icon, "", tint = LumenInk, modifier = Modifier.size(16.dp))
                                }
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(
                                        section.title,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = LumenInk
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        section.content,
                                        fontSize = 12.sp,
                                        color = LumenGray,
                                        lineHeight = 17.sp
                                    )
                                }
                            }
                        }
                    }
                }

                HorizontalDivider(color = LumenBorder)

                // Footer button
                Box(modifier = Modifier.padding(16.dp)) {
                    Button(
                        onClick = onDismiss,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LumenCta, contentColor = LumenOnCta),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("ENTENDIDO", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
