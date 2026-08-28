package pe.ebyzom.lumen.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pe.ebyzom.lumen.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LumenMenuSheet(
    onDismiss: () -> Unit,
    onOpenAI: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenManual: () -> Unit,
    onOpenDonation: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = LumenBg,
        dragHandle = { BottomSheetDefaults.DragHandle(color = LumenBorder) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 48.dp)
        ) {
            Text(
                "HERRAMIENTAS DE ESTUDIO",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
                color = LumenGray,
                modifier = Modifier.padding(bottom = 20.dp)
            )

            MenuRow(
                icon = Icons.Default.Star,
                label = "IA Atelier",
                description = "Genera y optimiza guiones con Gemini",
                color = LumenInk,
                onClick = {
                    onDismiss()
                    onOpenAI()
                }
            )

            Divider(color = LumenBorder, modifier = Modifier.padding(vertical = 8.dp))

            MenuRow(
                icon = Icons.Default.Settings,
                label = "Configuración",
                description = "Calibración óptica y teleprompter",
                color = LumenInk,
                onClick = {
                    onDismiss()
                    onOpenSettings()
                }
            )

            Divider(color = LumenBorder, modifier = Modifier.padding(vertical = 8.dp))

            MenuRow(
                icon = Icons.Default.Info,
                label = "Manual de Uso",
                description = "Aprende a usar Lumen Studio",
                color = LumenInk,
                onClick = {
                    onDismiss()
                    onOpenManual()
                }
            )

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = onOpenDonation,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB91C1C)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Favorite, "", modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Text("APOYAR PROYECTO (DONAR)", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun MenuRow(
    icon: ImageVector,
    label: String,
    description: String,
    color: Color,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier.size(44.dp).background(LumenPaper, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, "", tint = color, modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.width(16.dp))
        Column {
            Text(label, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = color)
            Text(description, fontSize = 12.sp, color = LumenGray)
        }
    }
}
