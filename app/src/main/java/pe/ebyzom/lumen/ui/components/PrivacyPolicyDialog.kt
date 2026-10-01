package pe.ebyzom.lumen.ui.components

import android.content.Intent
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import pe.ebyzom.lumen.ui.theme.*

data class PolicyPoint(
    val title: String,
    val icon: ImageVector,
    val content: String
)

@Composable
fun PrivacyPolicyDialog(
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val points = listOf(
        PolicyPoint(
            title = "100% Procesamiento y Guardado Local",
            icon = Icons.Default.Lock,
            content = "Tus guiones, textos y documentos importados (.txt, .pdf, .docx) residen de forma estrictamente local en tu dispositivo (SQLite/Room). Nunca se suben a servidores externos ni a la nube."
        ),
        PolicyPoint(
            title = "Uso de la Cámara y Micrófono",
            icon = Icons.Default.Videocam,
            content = "La cámara y el micrófono se utilizan únicamente cuando decides leer o grabar una toma. Los videos se guardan directamente en el almacenamiento de tu teléfono (Películas / Lumen) y nunca son transmitidos a terceros."
        ),
        PolicyPoint(
            title = "Publicidad (Google AdMob)",
            icon = Icons.Default.Info,
            content = "Lumen muestra anuncios a través de Google AdMob para sostener el proyecto. Google puede recopilar identificadores de dispositivo no personales para la entrega y medición de anuncios de acuerdo con la Política de Privacidad de Google."
        ),
        PolicyPoint(
            title = "Control y Eliminación Total",
            icon = Icons.Default.Delete,
            content = "Tienes el control total de tus datos: borrar un guión o desinstalar la app elimina tus contenidos inmediatamente del dispositivo."
        )
    )

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = LumenPaper,
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            "POLÍTICA DE PRIVACIDAD",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            letterSpacing = 1.sp,
                            color = LumenInk
                        )
                        Text(
                            "Lumen Teleprompter • Septiembre 2026",
                            fontSize = 11.sp,
                            color = LumenGray
                        )
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .size(36.dp)
                            .background(LumenPaper, CircleShape)
                    ) {
                        Icon(Icons.Default.Close, "Cerrar", tint = LumenInk, modifier = Modifier.size(18.dp))
                    }
                }

                HorizontalDivider(color = LumenBorder, modifier = Modifier.padding(vertical = 14.dp))

                // Scrollable Content
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Privacy summary banner
                    Surface(
                        color = Color(0xFFF3F4F6),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, "", tint = LumenAccent, modifier = Modifier.size(24.dp))
                            Spacer(Modifier.width(10.dp))
                            Text(
                                "El archivo privacy_policy.html está generado en la raíz del proyecto y listo para vincular en Google Play Console.",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = LumenInk
                            )
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    points.forEach { point ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(LumenPaper, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(point.icon, "", tint = LumenInk, modifier = Modifier.size(18.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(point.title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = LumenInk)
                                Spacer(Modifier.height(2.dp))
                                Text(point.content, fontSize = 12.sp, color = LumenGray, lineHeight = 16.sp)
                            }
                        }
                    }

                    Spacer(Modifier.height(14.dp))

                    Text(
                        "Contacto y Desarrollador:",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = LumenInk
                    )
                    Text(
                        "Lumen Studio • Email: soporte@ebyzom.pe",
                        fontSize = 11.sp,
                        color = LumenGray
                    )
                }

                Spacer(Modifier.height(12.dp))

                // Action Buttons (Compartir Texto / Entendido)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_SUBJECT, "Política de Privacidad - Lumen Teleprompter")
                                putExtra(
                                    Intent.EXTRA_TEXT,
                                    "Política de Privacidad - Lumen Teleprompter\n" +
                                            "Tus datos y guiones se guardan 100% de manera local en tu dispositivo.\n" +
                                            "Permisos de cámara y audio utilizados exclusivamente para grabar video en tu teléfono.\n" +
                                            "Publicidad provista por Google AdMob.\n" +
                                            "Contacto: soporte@ebyzom.pe"
                                )
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Compartir Política de Privacidad"))
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Share, "", modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("COMPARTIR", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = onDismiss,
                        colors = ButtonDefaults.buttonColors(containerColor = LumenCta, contentColor = LumenOnCta),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("ENTENDIDO", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
